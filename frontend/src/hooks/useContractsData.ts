import { useState, useEffect, useCallback } from "react";
import { 
  Address, 
  nativeToScVal, 
  xdr, 
  Horizon 
} from "@stellar/stellar-sdk";
import { isConnected, getAddress } from "@stellar/freighter-api";
import { CONTRACTS } from "../contracts/config";
import { simulateCall, submitTransaction } from "../contracts/soroban";

// Setup Horizon server for balance checks
const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");

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
  amount: number; // Native decimal/BigInt representation
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
  type: "group_created" | "member_joined" | "member_left" | "expense_added" | "expense_deleted" | "debt_settled";
  timestamp: string;
  details: string;
  txHash: string;
}

export function useContractsData() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState("0.00");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Check wallet connection
  const checkWallet = useCallback(async () => {
    try {
      const connObj = await isConnected();
      const connected = !!connObj.isConnected;
      setWalletConnected(connected);
      if (connected) {
        const addrObj = await getAddress();
        const address = addrObj.address;
        if (address) {
          setUserAddress(address);
          // Load balance
          const acc = await horizon.loadAccount(address);
          const bal = acc.balances.find((b) => b.asset_type === "native");
          setUserBalance(bal ? parseFloat(bal.balance).toFixed(2) : "0.00");
        }
      } else {
        setUserAddress(null);
        setUserBalance("0.00");
      }
    } catch (err: any) {
      console.error("Wallet check failed:", err);
    }
  }, []);

  // Fetch all contract state
  const fetchData = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      // 1. Get group count
      const countResult = await simulateCall(CONTRACTS.groupManager, "get_group_count", []);
      const count = Number(countResult);

      const loadedGroups: Group[] = [];

      // 2. Fetch details for each group in parallel
      const groupPromises = Array.from({ length: count }, (_, idx) => idx + 1).map(async (groupId) => {
        try {
          // Fetch group basic info
          const groupInfo = await simulateCall(CONTRACTS.groupManager, "get_group", [
            nativeToScVal(groupId, { type: "u32" })
          ]);
          if (!groupInfo) return null;

          // Fetch group members
          const membersList = await simulateCall(CONTRACTS.groupManager, "get_members", [
            nativeToScVal(groupId, { type: "u32" })
          ]);

          // Fetch expenses
          const rawExpenses = await simulateCall(CONTRACTS.expenseManager, "get_group_expenses", [
            nativeToScVal(groupId, { type: "u32" })
          ]);

          // Fetch debts
          const rawDebts = await simulateCall(CONTRACTS.settlementManager, "get_group_debts", [
            nativeToScVal(groupId, { type: "u32" })
          ]);

          const members: string[] = Array.isArray(membersList) ? membersList : [];
          const debts: Debt[] = (Array.isArray(rawDebts) ? rawDebts : []).map((d: any) => ({
            debtor: d.debtor,
            creditor: d.creditor,
            amount: Number(d.amount) / 100 // Convert back from cents/scaled int if scaled
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

  // Sync wallet on mount
  useEffect(() => {
    checkWallet();
    // Refresh balance periodically
    const interval = setInterval(checkWallet, 15000);
    return () => clearInterval(interval);
  }, [checkWallet]);

  // Sync contract data when connected or explicitly triggered
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 1. Create Group
  const createGroup = async (name: string) => {
    if (!userAddress) throw new Error("Wallet not connected");
    setLoading(true);
    setError(null);
    try {
      const args = [
        Address.fromString(userAddress).toScVal(),
        nativeToScVal(name, { type: "string" })
      ];
      const txHash = await submitTransaction(userAddress, CONTRACTS.groupManager, "create_group", args);
      
      // Update logs
      setActivityLogs((prev) => [
        {
          id: Math.random().toString(),
          type: "group_created",
          timestamp: new Date().toISOString(),
          details: `Created group "${name}"`,
          txHash
        },
        ...prev
      ]);
      await fetchData();
      await checkWallet();
    } catch (err: any) {
      setError(err.message || "Failed to create group.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 2. Join Group
  const joinGroup = async (groupId: number) => {
    if (!userAddress) throw new Error("Wallet not connected");
    setLoading(true);
    setError(null);
    try {
      const args = [
        nativeToScVal(groupId, { type: "u32" }),
        Address.fromString(userAddress).toScVal()
      ];
      const txHash = await submitTransaction(userAddress, CONTRACTS.groupManager, "join_group", args);
      
      setActivityLogs((prev) => [
        {
          id: Math.random().toString(),
          type: "member_joined",
          timestamp: new Date().toISOString(),
          details: `Joined group #${groupId}`,
          txHash
        },
        ...prev
      ]);
      await fetchData();
      await checkWallet();
    } catch (err: any) {
      setError(err.message || "Failed to join group.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 3. Leave Group
  const leaveGroup = async (groupId: number) => {
    if (!userAddress) throw new Error("Wallet not connected");
    setLoading(true);
    setError(null);
    try {
      const args = [
        nativeToScVal(groupId, { type: "u32" }),
        Address.fromString(userAddress).toScVal()
      ];
      const txHash = await submitTransaction(userAddress, CONTRACTS.groupManager, "leave_group", args);
      
      setActivityLogs((prev) => [
        {
          id: Math.random().toString(),
          type: "member_left",
          timestamp: new Date().toISOString(),
          details: `Left group #${groupId}`,
          txHash
        },
        ...prev
      ]);
      await fetchData();
      await checkWallet();
    } catch (err: any) {
      setError(err.message || "Failed to leave group.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 4. Add Expense
  const addExpense = async (
    groupId: number,
    description: string,
    amount: number,
    splitType: number,
    splits: { member: string; value: number }[]
  ) => {
    if (!userAddress) throw new Error("Wallet not connected");
    setLoading(true);
    setError(null);
    try {
      // Scale amount to cents/integers for contract storage precision (amount * 100)
      const scaledAmount = Math.round(amount * 100);
      const scaledSplits = splits.map((s) => ({
        member: s.member,
        value: Math.round(s.value * 100)
      }));

      // Pre-compile splits vector ScVal
      const splitsVecScVal = xdr.ScVal.scvVec(
        scaledSplits.map((s) => xdr.ScVal.scvMap([
          new xdr.ScMapEntry({
            key: xdr.ScVal.scvSymbol("member"),
            val: Address.fromString(s.member).toScVal()
          }),
          new xdr.ScMapEntry({
            key: xdr.ScVal.scvSymbol("value"),
            val: nativeToScVal(BigInt(s.value), { type: "i128" })
          })
        ]))
      );

      const args = [
        Address.fromString(CONTRACTS.groupManager).toScVal(),
        Address.fromString(CONTRACTS.settlementManager).toScVal(),
        nativeToScVal(groupId, { type: "u32" }),
        nativeToScVal(description, { type: "string" }),
        nativeToScVal(BigInt(scaledAmount), { type: "i128" }),
        Address.fromString(userAddress).toScVal(),
        nativeToScVal(splitType, { type: "u32" }),
        splitsVecScVal
      ];

      const txHash = await submitTransaction(userAddress, CONTRACTS.expenseManager, "add_expense", args);
      
      setActivityLogs((prev) => [
        {
          id: Math.random().toString(),
          type: "expense_added",
          timestamp: new Date().toISOString(),
          details: `Added expense "${description}" of $${amount.toFixed(2)}`,
          txHash
        },
        ...prev
      ]);
      await fetchData();
      await checkWallet();
    } catch (err: any) {
      setError(err.message || "Failed to add expense.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 5. Delete Expense
  const deleteExpense = async (groupId: number, expenseId: number) => {
    if (!userAddress) throw new Error("Wallet not connected");
    setLoading(true);
    setError(null);
    try {
      const args = [
        Address.fromString(CONTRACTS.settlementManager).toScVal(),
        nativeToScVal(groupId, { type: "u32" }),
        nativeToScVal(expenseId, { type: "u32" }),
        Address.fromString(userAddress).toScVal()
      ];

      const txHash = await submitTransaction(userAddress, CONTRACTS.expenseManager, "delete_expense", args);
      
      setActivityLogs((prev) => [
        {
          id: Math.random().toString(),
          type: "expense_deleted",
          timestamp: new Date().toISOString(),
          details: `Deleted expense #${expenseId} in group #${groupId}`,
          txHash
        },
        ...prev
      ]);
      await fetchData();
      await checkWallet();
    } catch (err: any) {
      setError(err.message || "Failed to delete expense.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 6. Settle Debt Manual
  const settleDebtManual = async (groupId: number, creditor: string, amount: number) => {
    if (!userAddress) throw new Error("Wallet not connected");
    setLoading(true);
    setError(null);
    try {
      const scaledAmount = Math.round(amount * 100);
      const args = [
        nativeToScVal(groupId, { type: "u32" }),
        Address.fromString(userAddress).toScVal(), // debtor
        Address.fromString(creditor).toScVal(),
        nativeToScVal(BigInt(scaledAmount), { type: "i128" })
      ];

      const txHash = await submitTransaction(userAddress, CONTRACTS.settlementManager, "settle_debt_manual", args);
      
      setActivityLogs((prev) => [
        {
          id: Math.random().toString(),
          type: "debt_settled",
          timestamp: new Date().toISOString(),
          details: `Manually settled $${amount.toFixed(2)} with ${creditor.slice(0, 6)}...${creditor.slice(-4)}`,
          txHash
        },
        ...prev
      ]);
      await fetchData();
      await checkWallet();
    } catch (err: any) {
      setError(err.message || "Failed to settle debt manually.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 7. Settle Debt Token (XLM Native contract)
  const settleDebtToken = async (groupId: number, creditor: string, amount: number) => {
    if (!userAddress) throw new Error("Wallet not connected");
    setLoading(true);
    setError(null);
    try {
      const scaledAmount = Math.round(amount * 100);
      const args = [
        Address.fromString(CONTRACTS.xlmToken).toScVal(),
        nativeToScVal(groupId, { type: "u32" }),
        Address.fromString(userAddress).toScVal(), // debtor
        Address.fromString(creditor).toScVal(),
        nativeToScVal(BigInt(scaledAmount), { type: "i128" })
      ];

      const txHash = await submitTransaction(userAddress, CONTRACTS.settlementManager, "settle_debt_token", args);
      
      setActivityLogs((prev) => [
        {
          id: Math.random().toString(),
          type: "debt_settled",
          timestamp: new Date().toISOString(),
          details: `Settled $${amount.toFixed(2)} using XLM Token with ${creditor.slice(0, 6)}...${creditor.slice(-4)}`,
          txHash
        },
        ...prev
      ]);
      await fetchData();
      await checkWallet();
    } catch (err: any) {
      setError(err.message || "Failed to settle debt using token.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 8. Add Member to Group
  const addMember = async (groupId: number, memberAddress: string) => {
    if (!userAddress) throw new Error("Wallet not connected");
    setLoading(true);
    setError(null);
    try {
      const args = [
        nativeToScVal(groupId, { type: "u32" }),
        Address.fromString(memberAddress).toScVal()
      ];
      const txHash = await submitTransaction(userAddress, CONTRACTS.groupManager, "join_group", args);
      
      setActivityLogs((prev) => [
        {
          id: Math.random().toString(),
          type: "member_joined",
          timestamp: new Date().toISOString(),
          details: `Added member ${memberAddress.slice(0, 6)}...${memberAddress.slice(-4)} to group #${groupId}`,
          txHash
        },
        ...prev
      ]);
      await fetchData();
      await checkWallet();
    } catch (err: any) {
      setError(err.message || "Failed to add group member.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    walletConnected,
    userAddress,
    userBalance,
    loading,
    refreshing,
    groups,
    activityLogs,
    error,
    checkWallet,
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
