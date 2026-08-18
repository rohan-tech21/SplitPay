import { useState, useEffect, useCallback } from "react";
import { 
  Address, 
  nativeToScVal
} from "@stellar/stellar-sdk";
import { CONTRACTS } from "../contracts/config";
import { simulateCall, submitTransaction, convertSplitsToScVal } from "../contracts/soroban";
import type { TxStep } from "../contracts/soroban";
import { useWallet } from "../wallet/WalletContext";
import { eventIngestion } from "../events/SorobanEventIngestion";
import type { LedgerEventLog } from "../events/SorobanEventIngestion";

export interface Group {
  id: number;
  name: string;
  creator: string;
  members: string[];
  expenses: Expense[];
  debts: Debt[];
}

export interface Expense {
  id: number;
  groupId: number;
  description: string;
  amount: number; // Native decimal
  paidBy: string;
  splitType: number; // 0=Equal, 1=Percentage, 2=Custom
  splits: { member: string; value: number }[];
}

export interface Debt {
  debtor: string;
  creditor: string;
  amount: number;
}

export interface ActivityLog {
  id: string;
  type: string;
  timestamp: string;
  details: string;
  txHash: string;
}

export interface TxProgressState {
  isProcessing: boolean;
  step: TxStep;
  message: string;
  txHash?: string;
}

export function useContractsData() {
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [txProgress, setTxProgress] = useState<TxProgressState>({
    isProcessing: false,
    step: 'Preparing',
    message: '',
  });

  const updateTxStatus = (step: TxStep, message: string, hash?: string) => {
    setTxProgress({
      isProcessing: step !== 'Success' && step !== 'Failed',
      step,
      message,
      txHash: hash,
    });
  };

  // Fetch all contract state from Soroban RPC simulation
  const fetchData = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      // 1. Get group count
      const countResult = await simulateCall(CONTRACTS.groupManager, "get_group_count", []);
      const count = Number(countResult || 0);

      const loadedGroups: Group[] = [];

      // 2. Fetch details for each group in parallel
      const groupPromises = Array.from({ length: count }, (_, idx) => idx + 1).map(async (groupId) => {
        try {
          const groupInfo = await simulateCall(CONTRACTS.groupManager, "get_group", [
            nativeToScVal(groupId, { type: "u32" })
          ]);
          if (!groupInfo) return null;

          const membersList = await simulateCall(CONTRACTS.groupManager, "get_members", [
            nativeToScVal(groupId, { type: "u32" })
          ]);

          const rawExpenses = await simulateCall(CONTRACTS.expenseManager, "get_group_expenses", [
            nativeToScVal(groupId, { type: "u32" })
          ]);

          const rawDebts = await simulateCall(CONTRACTS.settlementManager, "get_group_debts", [
            nativeToScVal(groupId, { type: "u32" })
          ]);

          const members: string[] = Array.isArray(membersList) ? membersList : [];
          const debts: Debt[] = (Array.isArray(rawDebts) ? rawDebts : []).map((d: any) => ({
            debtor: d.debtor,
            creditor: d.creditor,
            amount: Number(d.amount) / 100
          }));

          const expenses: Expense[] = (Array.isArray(rawExpenses) ? rawExpenses : []).map((e: any) => ({
            id: Number(e.id),
            groupId: Number(e.group_id),
            description: e.description,
            amount: Number(e.amount) / 100,
            paidBy: e.paid_by,
            splitType: Number(e.split_type),
            splits: (e.splits || []).map((s: any) => ({
              member: s.member,
              value: Number(s.value) / 100
            }))
          }));

          return {
            id: groupId,
            name: groupInfo.name,
            creator: groupInfo.creator,
            members,
            expenses,
            debts
          };
        } catch (err) {
          console.warn(`Failed to load details for group ${groupId}:`, err);
          return null;
        }
      });

      const resolved = await Promise.all(groupPromises);
      resolved.forEach((g) => {
        if (g) loadedGroups.push(g);
      });

      setGroups(loadedGroups);
    } catch (err: any) {
      console.error("Data synchronization failed:", err);
      setError(err.message || "Failed to synchronize ledger state.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Real-time Event Ingestion Polling setup
  useEffect(() => {
    fetchData();

    eventIngestion.startPolling((realEvents: LedgerEventLog[]) => {
      const formatted: ActivityLog[] = realEvents.map((ev) => ({
        id: ev.id,
        type: ev.topic,
        timestamp: ev.timestamp,
        details: ev.details,
        txHash: ev.txHash,
      }));
      setActivityLogs(formatted);
    }, 12000);

    return () => {
      eventIngestion.stopPolling();
    };
  }, [fetchData]);

  // Execute transaction with standard progress feedback
  const executeTx = async (
    contractId: string,
    functionName: string,
    args: any[]
  ): Promise<string> => {
    if (!wallet.address) {
      throw new Error("Please connect your wallet first.");
    }
    setLoading(true);
    setError(null);
    try {
      const hash = await submitTransaction(
        wallet.address,
        contractId,
        functionName,
        args,
        (xdrStr) => wallet.signTransaction(xdrStr),
        updateTxStatus
      );
      await fetchData();
      await wallet.refreshBalance();
      return hash;
    } catch (err: any) {
      setError(err.message || "Transaction failed.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 1. Create Group
  const createGroup = async (name: string) => {
    if (!wallet.address) throw new Error("Wallet not connected");
    const args = [
      Address.fromString(wallet.address).toScVal(),
      nativeToScVal(name, { type: "string" })
    ];
    return executeTx(CONTRACTS.groupManager, "create_group", args);
  };

  // 2. Join Group
  const joinGroup = async (groupId: number) => {
    if (!wallet.address) throw new Error("Wallet not connected");
    const args = [
      nativeToScVal(groupId, { type: "u32" }),
      Address.fromString(wallet.address).toScVal()
    ];
    return executeTx(CONTRACTS.groupManager, "join_group", args);
  };

  // 3. Leave Group
  const leaveGroup = async (groupId: number) => {
    if (!wallet.address) throw new Error("Wallet not connected");
    const args = [
      nativeToScVal(groupId, { type: "u32" }),
      Address.fromString(wallet.address).toScVal()
    ];
    return executeTx(CONTRACTS.groupManager, "leave_group", args);
  };

  // 4. Add Expense
  const addExpense = async (
    groupId: number,
    description: string,
    amount: number,
    splitType: number,
    splits: { member: string; value: number }[]
  ) => {
    if (!wallet.address) throw new Error("Wallet not connected");
    const scaledAmount = Math.round(amount * 100);

    let scaledSplits: { member: string; value: number }[] = [];
    if (splitType === 1) {
      // Percentage split: convert percentage (e.g. 50%) to basis points (5000 bps)
      scaledSplits = splits.map((s) => ({
        member: s.member,
        value: Math.round(s.value * 100)
      }));
    } else {
      // Equal or Custom split: convert dollar amounts to cents
      scaledSplits = splits.map((s) => ({
        member: s.member,
        value: Math.round(s.value * 100)
      }));
    }

    const splitsScVal = convertSplitsToScVal(scaledSplits);

    const args = [
      Address.fromString(CONTRACTS.groupManager).toScVal(),
      Address.fromString(CONTRACTS.settlementManager).toScVal(),
      nativeToScVal(groupId, { type: "u32" }),
      nativeToScVal(description, { type: "string" }),
      nativeToScVal(BigInt(scaledAmount), { type: "i128" }),
      Address.fromString(wallet.address).toScVal(),
      nativeToScVal(splitType, { type: "u32" }),
      splitsScVal
    ];

    return executeTx(CONTRACTS.expenseManager, "add_expense", args);
  };

  // 5. Delete Expense
  const deleteExpense = async (groupId: number, expenseId: number) => {
    if (!wallet.address) throw new Error("Wallet not connected");
    const args = [
      Address.fromString(CONTRACTS.settlementManager).toScVal(),
      nativeToScVal(groupId, { type: "u32" }),
      nativeToScVal(expenseId, { type: "u32" }),
      Address.fromString(wallet.address).toScVal()
    ];
    return executeTx(CONTRACTS.expenseManager, "delete_expense", args);
  };

  // 6. Settle Debt Manual
  const settleDebtManual = async (groupId: number, creditor: string, amount: number) => {
    if (!wallet.address) throw new Error("Wallet not connected");
    const scaledAmount = Math.round(amount * 100);
    const args = [
      nativeToScVal(groupId, { type: "u32" }),
      Address.fromString(wallet.address).toScVal(),
      Address.fromString(creditor).toScVal(),
      nativeToScVal(BigInt(scaledAmount), { type: "i128" })
    ];
    return executeTx(CONTRACTS.settlementManager, "settle_debt_manual", args);
  };

  // 7. Settle Debt Token (XLM Native SAC contract)
  const settleDebtToken = async (groupId: number, creditor: string, amount: number) => {
    if (!wallet.address) throw new Error("Wallet not connected");
    const scaledAmount = Math.round(amount * 100);
    const args = [
      Address.fromString(CONTRACTS.xlmToken).toScVal(),
      nativeToScVal(groupId, { type: "u32" }),
      Address.fromString(wallet.address).toScVal(),
      Address.fromString(creditor).toScVal(),
      nativeToScVal(BigInt(scaledAmount), { type: "i128" })
    ];
    return executeTx(CONTRACTS.settlementManager, "settle_debt_token", args);
  };

  // 8. Add Member to Group
  const addMember = async (groupId: number, memberAddress: string) => {
    if (!wallet.address) throw new Error("Wallet not connected");
    const args = [
      nativeToScVal(groupId, { type: "u32" }),
      Address.fromString(memberAddress).toScVal()
    ];
    return executeTx(CONTRACTS.groupManager, "join_group", args);
  };

  return {
    walletConnected: wallet.isConnected,
    userAddress: wallet.address,
    userBalance: wallet.balance.toFixed(2),
    loading,
    refreshing,
    groups,
    activityLogs,
    error,
    txProgress,
    clearError: () => setError(null),
    createGroup,
    joinGroup,
    leaveGroup,
    addExpense,
    deleteExpense,
    settleDebtManual,
    settleDebtToken,
    addMember,
    refreshData: fetchData
  };
}
