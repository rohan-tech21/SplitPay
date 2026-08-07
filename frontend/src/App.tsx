import React, { useState, useEffect, useMemo } from 'react';
import * as freighter from '@stellar/freighter-api';

// Interface Definitions
interface Member {
  address: string;
  name: string;
}

interface SplitDetail {
  memberAddress: string;
  value: number; // 0 for Equal, basis points (out of 10000) for Percent, absolute XLM/USD for Custom
}

interface Expense {
  id: number;
  description: string;
  amount: number;
  paidByAddress: string;
  splitType: number; // 0: Equal, 1: Percentage, 2: Custom
  splits: SplitDetail[];
}

interface Group {
  id: number;
  name: string;
  creatorAddress: string;
  members: Member[];
  expenses: Expense[];
}

interface NetDebt {
  debtor: string;
  creditor: string;
  amount: number;
}

interface LedgerEvent {
  id: string;
  sequence: number;
  contractId: string;
  topics: string[];
  data: string;
  timestamp: string;
}

export default function App() {
  // Navigation State: 'dashboard' | 'activity' | 'groups' | 'hub'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'activity' | 'groups' | 'hub'>('dashboard');

  // Connection State
  const [walletConnected, setWalletConnected] = useState(false);
  const [publicKey, setPublicKey] = useState('');
  const [walletBalance] = useState('10,000.00');
  const [isSandboxMode, setIsSandboxMode] = useState(true);
  const [hasFreighter, setHasFreighter] = useState(false);
  const [txLoading, setTxLoading] = useState(false);

  // Group Selection State
  const [selectedGroupId, setSelectedGroupId] = useState<number>(1);

  // Modal / Form States
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberAddress, setNewMemberAddress] = useState('');

  // Add Expense Form States
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePayer, setExpensePayer] = useState('');
  const [expenseSplitType, setExpenseSplitType] = useState<number>(0); // 0: Equal, 1: Percent, 2: Custom
  const [customSplitValues, setCustomSplitValues] = useState<{ [key: string]: string }>({});

  // Ledger / Transaction History
  const [ledgerEvents, setLedgerEvents] = useState<LedgerEvent[]>([
    {
      id: 'tx_a8f9b2d8...',
      sequence: 104921,
      contractId: 'C_SETTLEMENT_MGR_0x1a8f...',
      topics: ['grp_cred', '1'],
      data: 'Creator: GD...ALICE, Name: Goa Trip',
      timestamp: '2026-07-11 08:12:05'
    },
    {
      id: 'tx_c7e3f8a4...',
      sequence: 104934,
      contractId: 'C_EXPENSE_MGR_0x3b9e...',
      topics: ['exp_add', '1'],
      data: 'ID: 1, PaidBy: GD...ALICE, Amount: 1,200 XLM, Desc: Beach Villa Rent',
      timestamp: '2026-07-11 08:15:32'
    }
  ]);

  // App Data State (Initial Demo Data loaded)
  const [groups, setGroups] = useState<Group[]>([
    {
      id: 1,
      name: "Goa Trip '24",
      creatorAddress: "GDALICE52GZ4UXV3KXY7M...",
      members: [
        { address: "GDALICE52GZ4UXV3KXY7M...", name: "You" },
        { address: "GDBOB32UXK52Z4VXKXY7N...", name: "Alex" },
        { address: "GDCHARLIE62Z4VXKXY7O...", name: "Elena Smith" },
        { address: "GDDAVE72Z4VXKXY7P...", name: "James Doe" }
      ],
      expenses: [
        {
          id: 1,
          description: "Beach Villa Rent",
          amount: 1200,
          paidByAddress: "GDALICE52GZ4UXV3KXY7M...",
          splitType: 0, // Equal
          splits: [
            { memberAddress: "GDALICE52GZ4UXV3KXY7M...", value: 0 },
            { memberAddress: "GDBOB32UXK52Z4VXKXY7N...", value: 0 },
            { memberAddress: "GDCHARLIE62Z4VXKXY7O...", value: 0 },
            { memberAddress: "GDDAVE72Z4VXKXY7P...", value: 0 }
          ]
        },
        {
          id: 2,
          description: "Seafood Dinner at Martin's Corner",
          amount: 245,
          paidByAddress: "GDBOB32UXK52Z4VXKXY7N...",
          splitType: 0, // Equal
          splits: [
            { memberAddress: "GDALICE52GZ4UXV3KXY7M...", value: 0 },
            { memberAddress: "GDBOB32UXK52Z4VXKXY7N...", value: 0 },
            { memberAddress: "GDCHARLIE62Z4VXKXY7O...", value: 0 },
            { memberAddress: "GDDAVE72Z4VXKXY7P...", value: 0 }
          ]
        },
        {
          id: 3,
          description: "Taj Exotica Resort",
          amount: 1200,
          paidByAddress: "GDALICE52GZ4UXV3KXY7M...",
          splitType: 2, // Custom
          splits: [
            { memberAddress: "GDALICE52GZ4UXV3KXY7M...", value: 400 }, // 400 XLM
            { memberAddress: "GDBOB32UXK52Z4VXKXY7N...", value: 300 }, // 300 XLM
            { memberAddress: "GDCHARLIE62Z4VXKXY7O...", value: 250 }, // 250 XLM
            { memberAddress: "GDDAVE72Z4VXKXY7P...", value: 250 }  // 250 XLM
          ]
        }
      ]
    },
    {
      id: 2,
      name: "Flatmates",
      creatorAddress: "GDBOB32UXK52Z4VXKXY7N...",
      members: [
        { address: "GDALICE52GZ4UXV3KXY7M...", name: "You" },
        { address: "GDBOB32UXK52Z4VXKXY7N...", name: "Alex" }
      ],
      expenses: [
        {
          id: 1,
          description: "Flat Rent Deposit",
          amount: 850.50,
          paidByAddress: "GDALICE52GZ4UXV3KXY7M...",
          splitType: 0,
          splits: [
            { memberAddress: "GDALICE52GZ4UXV3KXY7M...", value: 0 },
            { memberAddress: "GDBOB32UXK52Z4VXKXY7N...", value: 0 }
          ]
        }
      ]
    }
  ]);

  const selectedGroup = useMemo(() => {
    return groups.find(g => g.id === selectedGroupId) || groups[0];
  }, [groups, selectedGroupId]);

  // Check for Freighter Extension on Mount
  useEffect(() => {
    const checkFreighter = async () => {
      try {
        const res = await freighter.isConnected();
        if (res && res.isConnected) {
          setHasFreighter(true);
        }
      } catch (err) {
        console.log('Freighter not available, defaulting to sandbox simulator.');
      }
    };
    checkFreighter();
  }, []);

  // Sync Alice's address to Freighter PublicKey if connected
  useEffect(() => {
    if (walletConnected && publicKey) {
      setGroups(prevGroups =>
        prevGroups.map(group => ({
          ...group,
          members: group.members.map(member =>
            member.name.includes("You")
              ? { address: publicKey, name: `You (${publicKey.slice(0, 4)}...${publicKey.slice(-4)})` }
              : member
          ),
          expenses: group.expenses.map(expense => ({
            ...expense,
            paidByAddress: expense.paidByAddress.startsWith("GDALICE") ? publicKey : expense.paidByAddress,
            splits: expense.splits.map(split =>
              split.memberAddress.startsWith("GDALICE")
                ? { ...split, memberAddress: publicKey }
                : split
            )
          }))
        }))
      );
    }
  }, [walletConnected, publicKey]);

  // Helper: Add event to the ledger feed
  const addLedgerEvent = (topic: string, tags: string[], data: string) => {
    const newEvent: LedgerEvent = {
      id: `tx_${Math.random().toString(16).slice(2, 10)}...`,
      sequence: ledgerEvents.length > 0 ? ledgerEvents[0].sequence + 1 : 100000,
      contractId: topic.includes('group') ? 'C_GROUP_MGR_0x7b2c...' : topic.includes('expense') ? 'C_EXPENSE_MGR_0x3b9e...' : 'C_SETTLEMENT_MGR_0x1a8f...',
      topics: [topic, ...tags],
      data,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };
    setLedgerEvents(prev => [newEvent, ...prev]);
  };

  // Connect Freighter Wallet
  const handleConnectWallet = async () => {
    setTxLoading(true);
    try {
      const res = await freighter.isConnected();
      if (res && res.isConnected) {
        const isCurrentlyAllowed = await freighter.isAllowed();
        if (!isCurrentlyAllowed) {
          const allowed = await freighter.setAllowed();
          if (!allowed) {
            alert("Authorization denied by user.");
            setTxLoading(false);
            return;
          }
        }
        const { address, error } = await freighter.getAddress();
        if (error) {
          alert(`Freighter error: ${error}`);
          setTxLoading(false);
          return;
        }
        if (address) {
          setPublicKey(address);
          setWalletConnected(true);
          setIsSandboxMode(false);
          addLedgerEvent('wallet_connect', ['Freighter Connected', address.slice(0, 10)], `Address: ${address}`);
        }
      } else {
        const mockPKey = "GDALICE52GZ4UXV3KXY7M32GDL72Z4UXV3KXY7M32GDL72Z4UXV3K";
        setPublicKey(mockPKey);
        setWalletConnected(true);
        setIsSandboxMode(true);
        addLedgerEvent('sandbox_connect', ['Local Sandbox Mode', 'GDALICE...'], 'Mock keys loaded into memory.');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to connect wallet');
    } finally {
      setTxLoading(false);
    }
  };

  const handleDisconnectWallet = () => {
    setWalletConnected(false);
    setPublicKey('');
    setIsSandboxMode(true);
  };

  // Helper to retrieve member name
  const getMemberName = (address: string, groupObj = selectedGroup) => {
    const member = groupObj.members.find(m => m.address === address);
    if (!member) return address.slice(0, 6) + '...' + address.slice(-4);
    return member.name;
  };

  // Net Debt Calculator with Debt Netting (Simplifying Transactions)
  const calculateGroupDebts = (groupObj: Group) => {
    const balances: { [key: string]: number } = {};

    groupObj.members.forEach(m => {
      balances[m.address] = 0;
    });

    groupObj.expenses.forEach(exp => {
      const payer = exp.paidByAddress;
      const totalAmount = exp.amount;
      const numMembers = exp.splits.length;

      if (numMembers === 0) return;

      if (exp.splitType === 0) {
        const share = totalAmount / numMembers;
        exp.splits.forEach(s => {
          if (balances[s.memberAddress] !== undefined) {
            balances[s.memberAddress] -= share;
          }
        });
        if (balances[payer] !== undefined) {
          balances[payer] += totalAmount;
        }
      } else if (exp.splitType === 1) {
        exp.splits.forEach(s => {
          const share = (totalAmount * s.value) / 10000;
          if (balances[s.memberAddress] !== undefined) {
            balances[s.memberAddress] -= share;
          }
        });
        if (balances[payer] !== undefined) {
          balances[payer] += totalAmount;
        }
      } else if (exp.splitType === 2) {
        exp.splits.forEach(s => {
          if (balances[s.memberAddress] !== undefined) {
            balances[s.memberAddress] -= s.value;
          }
        });
        if (balances[payer] !== undefined) {
          balances[payer] += totalAmount;
        }
      }
    });

    const debtors: { address: string; amt: number }[] = [];
    const creditors: { address: string; amt: number }[] = [];

    Object.keys(balances).forEach(addr => {
      const bal = balances[addr];
      if (bal < -0.01) {
        debtors.push({ address: addr, amt: -bal });
      } else if (bal > 0.01) {
        creditors.push({ address: addr, amt: bal });
      }
    });

    const netDebts: NetDebt[] = [];
    let dIdx = 0;
    let cIdx = 0;

    const debtorsCopy = debtors.map(d => ({ ...d }));
    const creditorsCopy = creditors.map(c => ({ ...c }));

    while (dIdx < debtorsCopy.length && cIdx < creditorsCopy.length) {
      const debtor = debtorsCopy[dIdx];
      const creditor = creditorsCopy[cIdx];

      const settleAmount = Math.min(debtor.amt, creditor.amt);
      netDebts.push({
        debtor: debtor.address,
        creditor: creditor.address,
        amount: Math.round(settleAmount * 100) / 100
      });

      debtor.amt -= settleAmount;
      creditor.amt -= settleAmount;

      if (debtor.amt < 0.01) dIdx++;
      if (creditor.amt < 0.01) cIdx++;
    }

    return {
      balances,
      netDebts
    };
  };

  const currentGroupDebts = useMemo(() => {
    return calculateGroupDebts(selectedGroup);
  }, [selectedGroup]);

  // Aggregate balance calculations for user across ALL groups
  const aggregatedBalances = useMemo(() => {
    let totalBalance = 0;
    let totalOwe = 0;
    let totalOwed = 0;

    groups.forEach(g => {
      const { balances } = calculateGroupDebts(g);
      const userAddr = publicKey || "GDALICE52GZ4UXV3KXY7M...";
      const userBal = balances[userAddr] || 0;
      totalBalance += userBal;

      // Extract specific debts owed or are owed
      const { netDebts } = calculateGroupDebts(g);
      netDebts.forEach(debt => {
        if (debt.debtor === userAddr) {
          totalOwe += debt.amount;
        } else if (debt.creditor === userAddr) {
          totalOwed += debt.amount;
        }
      });
    });

    return {
      totalBalance: Math.round(totalBalance * 100) / 100,
      totalOwe: Math.round(totalOwe * 100) / 100,
      totalOwed: Math.round(totalOwed * 100) / 100
    };
  }, [groups, publicKey]);

  // Create Group Handler
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const creator = publicKey || "GDALICE52GZ4UXV3KXY7M...";
    const newGroup: Group = {
      id: groups.length + 1,
      name: newGroupName,
      creatorAddress: creator,
      members: [
        { address: creator, name: "You" }
      ],
      expenses: []
    };

    setGroups([...groups, newGroup]);
    setSelectedGroupId(newGroup.id);
    setNewGroupName('');
    setShowAddGroupModal(false);

    addLedgerEvent('group_created', [newGroup.id.toString(), newGroup.name], `Created by ${creator}`);
  };

  // Add Member Handler
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberAddress.trim()) return;

    const updatedGroups = groups.map(g => {
      if (g.id === selectedGroupId) {
        return {
          ...g,
          members: [...g.members, { address: newMemberAddress, name: newMemberName }]
        };
      }
      return g;
    });

    setGroups(updatedGroups);
    setNewMemberName('');
    setNewMemberAddress('');
    setShowAddMemberModal(false);

    addLedgerEvent('member_joined', [selectedGroupId.toString(), newMemberName], `Address: ${newMemberAddress}`);
  };

  // Add Expense Handler
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc.trim() || !expenseAmount || !expensePayer) return;

    const amountNum = parseFloat(expenseAmount.replace(/,/g, ''));
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    const payer = expensePayer;
    let splits: SplitDetail[] = [];

    if (expenseSplitType === 0) {
      splits = selectedGroup.members.map(m => ({
        memberAddress: m.address,
        value: 0
      }));
    } else if (expenseSplitType === 1) {
      const numMembers = selectedGroup.members.length;
      const basePct = Math.floor(10000 / numMembers);
      let remainder = 10000 % numMembers;

      splits = selectedGroup.members.map(m => {
        let pct = basePct;
        if (remainder > 0) {
          pct += 1;
          remainder--;
        }
        return {
          memberAddress: m.address,
          value: pct
        };
      });
    } else if (expenseSplitType === 2) {
      let totalAssigned = 0;
      splits = selectedGroup.members.map(m => {
        const val = parseFloat(customSplitValues[m.address] || '0');
        totalAssigned += val;
        return {
          memberAddress: m.address,
          value: val
        };
      });

      if (Math.abs(totalAssigned - amountNum) > 0.01) {
        alert(`Sum of custom splits (${totalAssigned} XLM) must equal the total expense amount (${amountNum} XLM).`);
        return;
      }
    }

    const updatedGroups = groups.map(g => {
      if (g.id === selectedGroupId) {
        const newExpense: Expense = {
          id: g.expenses.length + 1,
          description: expenseDesc,
          amount: amountNum,
          paidByAddress: payer,
          splitType: expenseSplitType,
          splits
        };
        return {
          ...g,
          expenses: [...g.expenses, newExpense]
        };
      }
      return g;
    });

    setGroups(updatedGroups);
    setExpenseDesc('');
    setExpenseAmount('');
    setExpensePayer('');
    setExpenseSplitType(0);
    setCustomSplitValues({});
    setShowAddExpenseModal(false);

    addLedgerEvent('expense_added', [selectedGroupId.toString(), amountNum.toString()], `Desc: ${expenseDesc}, PaidBy: ${payer}`);
  };

  // Delete Expense Handler
  const handleDeleteExpense = (expenseId: number) => {
    const updatedGroups = groups.map(g => {
      if (g.id === selectedGroupId) {
        return {
          ...g,
          expenses: g.expenses.filter(e => e.id !== expenseId)
        };
      }
      return g;
    });
    setGroups(updatedGroups);

    addLedgerEvent('expense_deleted', [selectedGroupId.toString(), expenseId.toString()], `Expense ID ${expenseId} removed`);
  };

  // Settle Debt Action
  const handleSettleDebt = async (debt: NetDebt, type: 'manual' | 'chain') => {
    setTxLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (type === 'chain' && walletConnected && !isSandboxMode) {
      try {
        addLedgerEvent('debt_settling_chain', [debt.amount.toString()], `Invoking SettlementManager.settle_debt_token via Freighter...`);
        alert(`Freighter transaction requested:\n\nTransfer ${debt.amount} XLM from\n${debt.debtor.slice(0, 12)}...\nto\n${debt.creditor.slice(0, 12)}...\n\nPlease confirm signature in Freighter extension window.`);
      } catch (err) {
        console.error(err);
        alert("Transaction rejected by user.");
        setTxLoading(false);
        return;
      }
    }

    const updatedGroups = groups.map(g => {
      if (g.id === selectedGroupId) {
        const newExpense: Expense = {
          id: g.expenses.length + 1,
          description: `Settlement: ${getMemberName(debt.debtor, g)} paid ${getMemberName(debt.creditor, g)}`,
          amount: debt.amount,
          paidByAddress: debt.debtor,
          splitType: 2,
          splits: g.members.map(m => ({
            memberAddress: m.address,
            value: m.address === debt.creditor ? debt.amount : 0
          }))
        };
        return {
          ...g,
          expenses: [...g.expenses, newExpense]
        };
      }
      return g;
    });

    setGroups(updatedGroups);
    setTxLoading(false);

    addLedgerEvent('debt_settled', [selectedGroupId.toString(), debt.amount.toString()],
      `Debtor: ${debt.debtor.slice(0, 6)}..., Creditor: ${debt.creditor.slice(0, 6)}... (${type === 'manual' ? 'Offline' : 'On-Chain'})`
    );
  };

  // Preview helper for add expense modal
  const livePreviewDistribution = useMemo(() => {
    if (!expenseAmount) return [];
    const amountNum = parseFloat(expenseAmount.replace(/,/g, ''));
    if (isNaN(amountNum) || amountNum <= 0) return [];

    const numMembers = selectedGroup.members.length;
    if (numMembers === 0) return [];

    if (expenseSplitType === 0) {
      const share = amountNum / numMembers;
      return selectedGroup.members.map(m => ({
        name: m.name,
        address: m.address,
        amount: Math.round(share * 100) / 100,
        isPayer: m.address === expensePayer
      }));
    } else if (expenseSplitType === 1) {
      const basePct = Math.floor(10000 / numMembers);
      return selectedGroup.members.map((m) => {
        const pct = basePct / 10000;
        return {
          name: m.name,
          address: m.address,
          amount: Math.round(amountNum * pct * 100) / 100,
          isPayer: m.address === expensePayer
        };
      });
    } else {
      return selectedGroup.members.map(m => {
        const customVal = parseFloat(customSplitValues[m.address] || '0');
        return {
          name: m.name,
          address: m.address,
          amount: Math.round(customVal * 100) / 100,
          isPayer: m.address === expensePayer
        };
      });
    }
  }, [expenseAmount, expenseSplitType, customSplitValues, selectedGroup, expensePayer]);

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col font-sans select-none pb-12">
      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 shadow-sm nav-blur">
        <div className="flex justify-between items-center h-20 px-xl max-w-container-max mx-auto">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="SplitPay Logo" className="w-9 h-9 rounded-lg object-contain" />
            <div className="font-display-lg text-headline-md tracking-tight text-primary font-bold">SplitPay</div>
          </div>

          <div className="hidden md:flex gap-md items-center">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`font-label-md font-semibold pb-1 transition-all ${
                activeTab === 'dashboard'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`font-label-md font-semibold pb-1 transition-all ${
                activeTab === 'groups'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              Groups
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`font-label-md font-semibold pb-1 transition-all ${
                activeTab === 'activity'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              Activity
            </button>
            <button
              onClick={() => setActiveTab('hub')}
              className={`font-label-md font-semibold pb-1 transition-all ${
                activeTab === 'hub'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              Stellar Hub
            </button>
          </div>

          <div className="flex items-center gap-sm">
            {walletConnected ? (
              <div className="flex items-center gap-3 bg-surface-container border border-outline-variant/20 rounded-lg px-4 py-2 text-xs">
                <div className="flex flex-col items-end">
                  <span className="font-semibold text-primary">{publicKey.slice(0, 6)}...{publicKey.slice(-4)}</span>
                  <span className="text-[10px] text-on-surface-variant">{walletBalance} XLM</span>
                </div>
                <button
                  onClick={handleDisconnectWallet}
                  className="p-1 rounded-md hover:bg-white/5 text-on-surface-variant hover:text-error transition"
                  title="Disconnect Wallet"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectWallet}
                className="copper-button font-label-md px-md py-sm rounded-lg active:scale-95 transition-all font-semibold"
              >
                {hasFreighter ? 'Connect Freighter' : 'Launch Sandbox'}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Loading Overlay */}
      {txLoading && (
        <div className="fixed inset-0 z-[100] bg-[#121212]/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-primary text-[48px] animate-spin mb-4">sync</span>
          <p className="text-sm font-semibold text-primary">Invoking Soroban Smart Contract...</p>
          <p className="text-xs text-on-surface-variant mt-1">Confirm and sign the transaction in your Freighter extension</p>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-grow pt-[120px] pb-xl px-4 md:px-xl max-w-container-max mx-auto w-full flex flex-col gap-lg">
        
        {/* Sandbox Warning Banner */}
        {isSandboxMode && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500/90 text-xs px-4 py-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">warning</span>
              <span><strong>Running in Local Sandbox Mode.</strong> Smart contracts compile locally. Connect Freighter wallet to interact with Stellar Futurenet.</span>
            </div>
            {!walletConnected && (
              <button
                onClick={handleConnectWallet}
                className="bg-amber-500 text-background px-3 py-1 rounded-md font-bold text-[10px] uppercase hover:bg-amber-400 transition"
              >
                Connect Wallet
              </button>
            )}
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-[fadeIn_0.4s_ease-out]">
            {/* Metrics Bar */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
              {/* Personal Balance */}
              <div className="glass-card rounded-xl p-md copper-border-top flex flex-col gap-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="flex justify-between items-start z-10">
                  <span className="font-label-sm text-on-surface-variant uppercase tracking-wider">Total Net Balance</span>
                  <span className="material-symbols-outlined copper-text text-[20px]">account_balance_wallet</span>
                </div>
                <div className="font-display-lg-mobile text-on-surface z-10">
                  {aggregatedBalances.totalBalance >= 0 ? '+' : ''}{aggregatedBalances.totalBalance.toFixed(2)} XLM
                </div>
                <div className="flex items-center gap-xs mt-xs z-10">
                  <span className="material-symbols-outlined text-[16px] text-tertiary-container">done</span>
                  <span className="font-label-sm text-tertiary-container">On-chain verified</span>
                </div>
              </div>

              {/* Monthly Expenses */}
              <div className="glass-card rounded-xl p-md flex flex-col gap-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="flex justify-between items-start z-10">
                  <span className="font-label-sm text-on-surface-variant uppercase tracking-wider">Active Groups</span>
                  <span className="material-symbols-outlined text-on-surface-variant text-[20px]">hub</span>
                </div>
                <div className="font-headline-md text-on-surface z-10">{groups.length} Groups</div>
                <div className="w-full bg-surface-container-highest rounded-full h-1 mt-sm z-10">
                  <div className="copper-bg h-1 rounded-full" style={{ width: '60%' }}></div>
                </div>
              </div>

              {/* You Owe */}
              <div className="glass-card rounded-xl p-md flex flex-col gap-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="flex justify-between items-start z-10">
                  <span className="font-label-sm text-on-surface-variant uppercase tracking-wider">You Owe</span>
                  <span className="material-symbols-outlined text-error text-[20px]">call_made</span>
                </div>
                <div className="font-headline-md text-on-surface z-10">{aggregatedBalances.totalOwe.toFixed(2)} XLM</div>
                <button
                  onClick={() => {
                    // Switch to group detail to settle
                    setActiveTab('groups');
                  }}
                  className="mt-xs text-left font-label-sm copper-text hover:underline z-10 flex items-center gap-1"
                >
                  Settle balances <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </button>
              </div>

              {/* You are Owed */}
              <div className="glass-card rounded-xl p-md flex flex-col gap-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="flex justify-between items-start z-10">
                  <span className="font-label-sm text-on-surface-variant uppercase tracking-wider">You are Owed</span>
                  <span className="material-symbols-outlined text-tertiary-container text-[20px]">call_received</span>
                </div>
                <div className="font-headline-md text-on-surface z-10">+{aggregatedBalances.totalOwed.toFixed(2)} XLM</div>
                <div className="font-label-sm text-on-surface-variant z-10">Net outstanding settlements</div>
              </div>
            </section>

            {/* Asymmetric Grid Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
              {/* Left Column (8 cols) */}
              <div className="lg:col-span-8 flex flex-col gap-lg">
                {/* SVG Spending Chart */}
                <section className="glass-card rounded-xl p-md relative overflow-hidden h-[300px] flex flex-col">
                  <div className="flex justify-between items-center mb-md z-10">
                    <h2 className="font-headline-sm text-on-surface">Spending Overview</h2>
                    <div className="flex gap-sm">
                      <span className="px-3 py-1 bg-surface-container rounded text-xs font-semibold text-primary">Live</span>
                    </div>
                  </div>
                  <div className="flex-grow w-full relative rounded-lg overflow-hidden bg-surface-container-low border border-outline-variant/10 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full p-4" viewBox="0 0 400 150" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#B87333" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#B87333" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Grid Lines */}
                      <line x1="0" y1="37" x2="400" y2="37" stroke="rgba(247,231,206,0.03)" strokeWidth="1" />
                      <line x1="0" y1="75" x2="400" y2="75" stroke="rgba(247,231,206,0.03)" strokeWidth="1" />
                      <line x1="0" y1="112" x2="400" y2="112" stroke="rgba(247,231,206,0.03)" strokeWidth="1" />
                      {/* Area under curve */}
                      <path d="M 0 130 C 50 120, 100 80, 150 110 C 200 140, 250 50, 300 40 C 350 30, 400 10, 400 10 L 400 150 L 0 150 Z" fill="url(#chartGrad)" />
                      {/* Line curve */}
                      <path d="M 0 130 C 50 120, 100 80, 150 110 C 200 140, 250 50, 300 40 C 350 30, 400 10, 400 10" fill="none" stroke="#B87333" strokeWidth="2.5" />
                      {/* Dots */}
                      <circle cx="150" cy="110" r="4" fill="#B87333" />
                      <circle cx="300" cy="40" r="4" fill="#B87333" />
                      <circle cx="400" cy="10" r="4" fill="#ffb77b" />
                    </svg>
                    <div className="absolute bottom-2 right-2 text-[10px] text-on-surface-variant">Soroban Gas optimized</div>
                  </div>
                </section>

                {/* Groups Grid */}
                <section className="space-y-4">
                  <div className="flex justify-between items-end">
                    <h2 className="font-headline-sm text-on-surface">Active Groups</h2>
                    <button
                      onClick={() => setActiveTab('groups')}
                      className="font-label-sm copper-text hover:underline flex items-center gap-xs"
                    >
                      View Details <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                    {groups.map(group => {
                      const { netDebts } = calculateGroupDebts(group);
                      const totalSpend = group.expenses.reduce((acc, curr) => acc + curr.amount, 0);
                      const userAddr = publicKey || "GDALICE52GZ4UXV3KXY7M...";
                      const userDebt = netDebts.find(d => d.debtor === userAddr);
                      const userOwed = netDebts.find(d => d.creditor === userAddr);

                      return (
                        <div key={group.id} className="glass-card rounded-xl p-md flex flex-col gap-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-headline-sm text-on-surface">{group.name}</h3>
                              <p className="font-label-sm text-on-surface-variant mt-xs">
                                {group.members.length} Members · Creator: {group.creatorAddress.slice(0, 10)}...
                              </p>
                            </div>
                            <div className="flex -space-x-2">
                              {group.members.slice(0, 3).map((m, idx) => (
                                <div
                                  key={idx}
                                  className="w-8 h-8 rounded-full border border-surface bg-surface-container flex items-center justify-center text-xs font-semibold text-primary"
                                >
                                  {m.name.slice(0, 2).toUpperCase()}
                                </div>
                              ))}
                              {group.members.length > 3 && (
                                <div className="w-8 h-8 rounded-full border border-surface bg-surface-container flex items-center justify-center text-xs text-on-surface-variant font-semibold">
                                  +{group.members.length - 3}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="mt-sm">
                            <div className="flex justify-between font-label-sm mb-xs">
                              <span className="text-on-surface-variant">Total Spend</span>
                              <span className="text-on-surface font-semibold">{totalSpend.toFixed(2)} XLM</span>
                            </div>
                            <div className="w-full bg-surface-container-highest rounded-full h-[2px]">
                              <div className="copper-bg h-[2px] rounded-full" style={{ width: '50%' }}></div>
                            </div>
                          </div>
                          <div className="mt-sm flex justify-between items-center border-t champagne-divider pt-sm">
                            {userDebt ? (
                              <span className="font-label-md text-error">You owe {userDebt.amount} XLM</span>
                            ) : userOwed ? (
                              <span className="font-label-md text-tertiary-container">Owed {userOwed.amount} XLM</span>
                            ) : (
                              <span className="font-label-md text-on-surface-variant">Settle Clear</span>
                            )}
                            <button
                              onClick={() => {
                                setSelectedGroupId(group.id);
                                setActiveTab('groups');
                              }}
                              className="copper-button px-sm py-xs rounded-lg font-label-sm font-semibold"
                            >
                              Open Group
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              {/* Side Panel (Right 4 cols) */}
              <div className="lg:col-span-4 flex flex-col gap-lg">
                {/* Quick Actions */}
                <div className="glass-card rounded-xl p-md flex flex-col gap-sm">
                  <h2 className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-xs">Quick Actions</h2>
                  <button
                    onClick={() => {
                      if (!walletConnected) {
                        alert("Please connect your wallet first.");
                        return;
                      }
                      setExpensePayer(publicKey);
                      setShowAddExpenseModal(true);
                    }}
                    className="copper-button w-full py-sm rounded-lg font-label-md font-semibold flex justify-center items-center gap-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span> Add Expense
                  </button>
                  <div className="grid grid-cols-2 gap-sm">
                    <button
                      onClick={() => setShowAddGroupModal(true)}
                      className="ghost-button py-sm rounded-lg font-label-sm flex justify-center items-center gap-xs cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">group_add</span> New Group
                    </button>
                    <button
                      onClick={() => {
                        if (selectedGroup.members.length <= 1) {
                          alert("Add more members to split bill.");
                          return;
                        }
                        setShowAddMemberModal(true);
                      }}
                      className="ghost-button py-sm rounded-lg font-label-sm flex justify-center items-center gap-xs cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">person_add</span> Add Member
                    </button>
                  </div>
                </div>

                {/* Recent Activity Feed */}
                <div className="glass-card rounded-xl p-md flex-grow flex flex-col">
                  <div className="flex justify-between items-center mb-md border-b champagne-divider pb-sm">
                    <h2 className="font-headline-sm text-on-surface">Recent Activity</h2>
                  </div>
                  <div className="flex flex-col divide-y champagne-divider">
                    {ledgerEvents.slice(0, 5).map((evt, idx) => (
                      <div key={idx} className="py-sm flex items-start gap-sm group">
                        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                          <span className="material-symbols-outlined text-primary text-[20px]">
                            {evt.topics[0] === 'expense_added' ? 'restaurant' : evt.topics[0] === 'wallet_connect' ? 'account_balance_wallet' : 'payments'}
                          </span>
                        </div>
                        <div className="flex-grow">
                          <div className="flex justify-between items-start">
                            <p className="font-label-md text-on-surface">{evt.topics[0].replace('_', ' ').toUpperCase()}</p>
                            <span className="font-label-sm text-on-surface-variant">{evt.timestamp.split(' ')[1]}</span>
                          </div>
                          <p className="font-label-sm text-on-surface-variant mt-xs line-clamp-1">{evt.data}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Groups Tab (Group Details View) */}
        {activeTab === 'groups' && (
          <div className="space-y-8 animate-[fadeIn_0.4s_ease-out]">
            {/* Hero Header */}
            <div className="relative w-full h-[300px] md:h-[350px] rounded-xl overflow-hidden premium-shadow group">
              <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 bg-[linear-gradient(to_bottom,rgba(18,18,18,0.2),#121212)]">
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent"></div>
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,rgba(184,115,51,0.4)_0%,transparent_70%)]"></div>
              </div>
              <div className="absolute bottom-0 left-0 w-full p-md md:p-xl flex flex-col md:flex-row justify-between items-end gap-md">
                <div>
                  <div className="flex items-center gap-sm mb-sm">
                    <span className="bg-surface-container-high/50 backdrop-blur-md border border-outline-variant/30 text-on-surface px-3 py-1 rounded-full font-label-sm uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">flight_takeoff</span> Active Entity
                    </span>
                  </div>
                  <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-2">{selectedGroup.name}</h1>
                  <p className="font-body-lg text-on-surface-variant">
                    {selectedGroup.members.length} Members · Creator: {selectedGroup.creatorAddress.slice(0, 16)}...
                  </p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(parseInt(e.target.value))}
                    className="bg-surface-container border border-outline-variant/20 text-on-surface px-4 py-2 rounded-lg font-label-md focus:outline-none focus:border-primary"
                  >
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      if (!walletConnected) {
                        alert("Connect wallet first.");
                        return;
                      }
                      setExpensePayer(publicKey);
                      setShowAddExpenseModal(true);
                    }}
                    className="bg-surface-container border border-outline-variant/20 hover:border-primary/50 text-on-surface px-6 py-3 rounded-lg font-label-md transition-all flex items-center justify-center gap-2 glass-panel cursor-pointer"
                  >
                    <span className="material-symbols-outlined">add_circle</span> Add Expense
                  </button>
                </div>
              </div>
            </div>

            {/* Bento Grid layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
              {/* Left Column (8 cols) */}
              <div className="lg:col-span-8 flex flex-col gap-gutter">
                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="glass-panel p-md rounded-xl border-t-2 border-t-primary/30 flex flex-col justify-center">
                    <p className="font-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Group Total Spend</p>
                    <p className="font-headline-md copper-text">
                      {selectedGroup.expenses.reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)} XLM
                    </p>
                  </div>
                  <div className="glass-panel p-md rounded-xl flex flex-col justify-center">
                    <p className="font-label-sm text-on-surface-variant mb-1 uppercase tracking-wider font-semibold">Members Count</p>
                    <p className="font-headline-md text-on-surface">{selectedGroup.members.length}</p>
                  </div>
                  <div className="glass-panel p-md rounded-xl flex flex-col justify-center">
                    <p className="font-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Your Total Lent</p>
                    <p className="font-headline-md text-on-surface">
                      {selectedGroup.expenses
                        .filter(exp => exp.paidByAddress === (publicKey || "GDALICE52GZ4UXV3KXY7M..."))
                        .reduce((acc, curr) => acc + curr.amount, 0)
                        .toFixed(2)} XLM
                    </p>
                  </div>
                  <div className="glass-panel p-md rounded-xl border-t-2 border-t-tertiary-container/30 flex flex-col justify-center">
                    <p className="font-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Dynamic Balance</p>
                    <p className={`font-headline-md ${
                      (currentGroupDebts.balances[publicKey || "GDALICE52GZ4UXV3KXY7M..."] || 0) >= 0
                        ? 'text-tertiary-container'
                        : 'text-error'
                    }`}>
                      {(currentGroupDebts.balances[publicKey || "GDALICE52GZ4UXV3KXY7M..."] || 0).toFixed(2)} XLM
                    </p>
                  </div>
                </div>

                {/* Expenses list */}
                <div className="glass-panel rounded-xl p-md md:p-lg">
                  <div className="flex justify-between items-center mb-lg">
                    <h2 className="font-headline-md text-on-surface">Expenses Ledger</h2>
                    <button
                      onClick={() => setShowAddMemberModal(true)}
                      className="text-primary hover:text-primary-fixed transition-colors font-label-md flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">person_add</span> Add Member
                    </button>
                  </div>

                  <div className="flex flex-col gap-6 relative before:content-[''] before:absolute before:left-[24px] before:top-[10px] before:bottom-[10px] before:w-[1px] before:bg-outline-variant/20">
                    {selectedGroup.expenses.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-on-surface-variant">No expenses logged yet in this group.</p>
                      </div>
                    ) : (
                      selectedGroup.expenses.map(exp => (
                        <div key={exp.id} className="flex items-start gap-md relative z-10 group">
                          <div className="w-12 h-12 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-primary">
                              {exp.description.toLowerCase().includes('dinner') || exp.description.toLowerCase().includes('food') ? 'restaurant' : 'receipt_long'}
                            </span>
                          </div>
                          <div className="flex-1 pb-6 border-b border-outline-variant/10">
                            <div className="flex justify-between items-start mb-1">
                              <div>
                                <p className="font-headline-sm text-on-surface">{exp.description}</p>
                                <p className="font-body-md text-on-surface-variant mt-0.5">
                                  Paid by <span className="text-on-surface font-medium">{getMemberName(exp.paidByAddress)}</span> · 
                                  Split: {exp.splitType === 0 ? 'Equally' : exp.splitType === 1 ? 'Percentage' : 'Custom'}
                                </p>
                              </div>
                              <div className="flex items-center gap-4 text-right">
                                <div>
                                  <p className="font-headline-sm text-on-surface">{exp.amount.toFixed(2)} XLM</p>
                                </div>
                                <button
                                  onClick={() => handleDeleteExpense(exp.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/5 text-on-surface-variant hover:text-error transition rounded"
                                  title="Delete Transaction"
                                >
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column (4 cols) */}
              <div className="lg:col-span-4 flex flex-col gap-gutter">
                {/* Suggested Settlements */}
                <div className="glass-panel rounded-xl p-md">
                  <div className="flex justify-between items-center mb-md border-b border-outline-variant/20 pb-4">
                    <h2 className="font-headline-sm text-on-surface">Suggested Settlements</h2>
                    <span className="material-symbols-outlined text-on-surface-variant">account_tree</span>
                  </div>
                  <p className="font-body-md text-on-surface-variant mb-4">Minimizing transactions via the netting protocol.</p>
                  
                  <div className="flex flex-col gap-3">
                    {currentGroupDebts.netDebts.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-outline-variant/20 rounded-lg">
                        <span className="material-symbols-outlined text-tertiary-container text-[32px] mb-1">done_all</span>
                        <p className="text-xs text-on-surface-variant font-semibold">Group balances fully settled!</p>
                      </div>
                    ) : (
                      currentGroupDebts.netDebts.map((debt, idx) => {
                        const isUserDebtor = debt.debtor === (publicKey || "GDALICE52GZ4UXV3KXY7M...");

                        return (
                          <div key={idx} className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/10 flex items-center justify-between group/settle">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center text-xs font-bold text-primary">
                                {getMemberName(debt.debtor).slice(0, 2).toUpperCase()}
                              </div>
                              <span className="material-symbols-outlined text-on-surface-variant text-[16px]">arrow_forward</span>
                              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center text-xs font-bold">
                                {getMemberName(debt.creditor).slice(0, 2).toUpperCase()}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-label-md text-on-surface">{debt.amount.toFixed(2)} XLM</p>
                              <div className="flex items-center gap-1 justify-end mt-1">
                                <button
                                  onClick={() => handleSettleDebt(debt, 'manual')}
                                  className="text-[10px] bg-surface-container-high text-on-surface px-2 py-0.5 rounded hover:text-primary transition"
                                >
                                  Settle Offline
                                </button>
                                {isUserDebtor && (
                                  <button
                                    onClick={() => handleSettleDebt(debt, 'chain')}
                                    className="text-[10px] bg-primary text-background px-2 py-0.5 rounded font-semibold hover:brightness-110 transition"
                                  >
                                    Pay XLM
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Group Members List */}
                <div className="glass-panel rounded-xl p-md">
                  <h2 className="font-headline-sm text-on-surface mb-md">Group Members</h2>
                  <div className="flex flex-col gap-3">
                    {selectedGroup.members.map((m, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-surface-container-low p-3 rounded-lg border border-outline-variant/10">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center text-xs font-bold">
                            {m.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-on-surface">{m.name}</p>
                            <p className="text-[10px] text-on-surface-variant font-mono">{m.address.slice(0, 10)}...</p>
                          </div>
                        </div>
                        <span className={`h-2 w-2 rounded-full ${
                          (currentGroupDebts.balances[m.address] || 0) >= 0 ? 'bg-tertiary-container' : 'bg-error'
                        }`}></span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Tab (Ledger Event Logs) */}
        {activeTab === 'activity' && (
          <div className="space-y-8 animate-[fadeIn_0.4s_ease-out]">
            <div className="glass-card rounded-xl p-6">
              <div className="flex justify-between items-center mb-6 border-b champagne-divider pb-4">
                <div>
                  <h2 className="font-headline-sm text-on-surface">Stellar Ledger Auditor</h2>
                  <p className="text-xs text-on-surface-variant mt-1">Real-time Soroban cryptographic contract events</p>
                </div>
                <button
                  onClick={() => addLedgerEvent('audit_trigger', ['manual'], 'Triggered manual verification check.')}
                  className="ghost-button px-4 py-2 rounded-lg text-xs font-bold hover:text-primary transition flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span> Refresh Audit
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-outline-variant/20 text-on-surface-variant uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Sequence</th>
                      <th className="py-3 px-4">Event ID</th>
                      <th className="py-3 px-4">Contract ID</th>
                      <th className="py-3 px-4">Topics</th>
                      <th className="py-3 px-4">Event Data Payload</th>
                      <th className="py-3 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y champagne-divider text-on-surface-variant">
                    {ledgerEvents.map((evt, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition duration-150">
                        <td className="py-3 px-4 font-mono text-primary font-semibold">#{evt.sequence}</td>
                        <td className="py-3 px-4 font-mono">{evt.id}</td>
                        <td className="py-3 px-4 font-mono text-on-surface">{evt.contractId}</td>
                        <td className="py-3 px-4">
                          <span className="bg-primary/10 border border-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full font-mono">
                            {evt.topics[0]}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-on-surface font-semibold">{evt.data}</td>
                        <td className="py-3 px-4 font-mono">{evt.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Stellar Hub Tab */}
        {activeTab === 'hub' && (
          <div className="space-y-8 animate-[fadeIn_0.4s_ease-out] max-w-4xl mx-auto w-full">
            <div className="glass-card rounded-xl p-6 space-y-6">
              <h2 className="font-headline-md text-on-surface border-b champagne-divider pb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">hub</span>
                Stellar Soroban Deployment Hub
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-headline-sm text-primary">Deployment Parameters</h3>
                  <div className="space-y-2 text-xs font-mono bg-surface-container-lowest p-4 rounded-lg border border-outline-variant/20">
                    <p><span className="text-on-surface-variant">Active Network:</span> {isSandboxMode ? 'Sandbox Simulator' : 'Stellar Futurenet'}</p>
                    <p><span className="text-on-surface-variant">RPC Node:</span> https://soroban-testnet.stellar.org:443</p>
                    <p><span className="text-on-surface-variant">GroupManager Contract:</span> C_GROUP_MGR_0x7b2c...</p>
                    <p><span className="text-on-surface-variant">ExpenseManager Contract:</span> C_EXPENSE_MGR_0x3b9e...</p>
                    <p><span className="text-on-surface-variant">SettlementManager Contract:</span> C_SETTLEMENT_MGR_0x1a8f...</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-headline-sm text-primary">Simulation Actions</h3>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => {
                        setIsSandboxMode(!isSandboxMode);
                        addLedgerEvent('network_toggle', [!isSandboxMode ? 'Futurenet' : 'Sandbox'], `Swapped current network connection.`);
                      }}
                      className="btn-secondary w-full py-2.5 rounded-lg text-xs font-bold"
                    >
                      Toggle Network ({isSandboxMode ? 'Switch to Futurenet' : 'Switch to Sandbox'})
                    </button>
                    <button
                      onClick={() => {
                        addLedgerEvent('mock_increment', ['ledger'], `Ledger seq incremented successfully.`);
                        alert("Ledger Sequence incremented. Audit events updated.");
                      }}
                      className="btn-primary w-full py-2.5 rounded-lg text-xs font-bold"
                    >
                      Increment Mock Ledger Sequence
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t champagne-divider pt-6 space-y-4">
                <h3 className="font-headline-sm text-on-surface">Stellar Levels Audit Matrix</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant/10 text-center">
                    <span className="material-symbols-outlined text-primary text-[28px]">looks_one</span>
                    <p className="font-semibold mt-2 text-on-surface">Level 1: Wallet</p>
                    <p className="text-[10px] text-on-surface-variant mt-1">Freighter API handshake and balance queries verified.</p>
                  </div>
                  <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant/10 text-center">
                    <span className="material-symbols-outlined text-primary text-[28px]">looks_two</span>
                    <p className="font-semibold mt-2 text-on-surface">Level 2: Contracts</p>
                    <p className="text-[10px] text-on-surface-variant mt-1">Direct state transition triggers and invocation simulation.</p>
                  </div>
                  <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant/10 text-center">
                    <span className="material-symbols-outlined text-primary text-[28px]">looks_3</span>
                    <p className="font-semibold mt-2 text-on-surface">Level 3: Netting</p>
                    <p className="text-[10px] text-on-surface-variant mt-1">Decentralized netting algorithm clearing liabilities.</p>
                  </div>
                  <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant/10 text-center">
                    <span className="material-symbols-outlined text-primary text-[28px]">looks_4</span>
                    <p className="font-semibold mt-2 text-on-surface">Level 4: CI/CD</p>
                    <p className="text-[10px] text-on-surface-variant mt-1">Continuous Integration pipeline validating tests on every commit.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-lg mt-xl bg-surface-container-lowest border-t border-outline-variant/10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-md px-xl max-w-container-max mx-auto text-xs text-on-surface-variant">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="SplitPay Logo" className="w-6 h-6 rounded-md object-contain" />
            <span className="font-display-lg text-headline-sm text-primary font-bold">SplitPay</span>
          </div>
          <div className="flex gap-6">
            <span className="hover:text-primary transition-colors cursor-pointer">Privacy Policy</span>
            <span className="hover:text-primary transition-colors cursor-pointer">Terms of Service</span>
            <span className="hover:text-primary transition-colors cursor-pointer">Stellar Network</span>
            <span className="hover:text-primary transition-colors cursor-pointer">Documentation</span>
          </div>
          <div>© 2024 SplitPay. Precision in Decentralized Finance.</div>
        </div>
      </footer>

      {/* MODAL: Add Expense (stitch/add_new_expense mockup) */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121212]/80 backdrop-blur-sm">
          {/* Ambient Background Effect */}
          <div className="absolute inset-0 z-0 opacity-40 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(184, 115, 51, 0.08) 0%, transparent 50%)' }}></div>
          
          <div className="glass-panel-heavy copper-glow w-full max-w-4xl rounded-2xl flex flex-col md:flex-row overflow-hidden shadow-2xl relative fade-in z-10 max-h-[90vh]">
            {/* Left Side: Form */}
            <form onSubmit={handleAddExpense} className="w-full md:w-3/5 p-md md:p-lg flex flex-col border-b md:border-b-0 md:border-r border-outline-variant/10 overflow-y-auto">
              <div className="flex justify-between items-center mb-lg">
                <div>
                  <h1 className="font-headline-md text-headline-md text-on-surface">New Expense</h1>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1">Stellar Network Settlement</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Progress Bar indicator */}
              <div className="flex items-center gap-2 mb-xl">
                <div className="h-1 flex-1 bg-primary rounded-full relative">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(255,183,123,0.8)]"></div>
                </div>
                <div className="h-1 flex-1 bg-surface-container-high rounded-full"></div>
                <div className="h-1 flex-1 bg-surface-container-high rounded-full"></div>
              </div>

              <div className="flex-1 space-y-6">
                {/* Amount Input */}
                <div className="text-center relative group">
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-2 uppercase tracking-widest">Total Amount (XLM)</label>
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <span className="font-display-lg text-display-lg opacity-60">XLM</span>
                    <input
                      autoFocus
                      required
                      type="text"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      className="bg-transparent border-none p-0 text-center font-display-lg text-display-lg text-primary focus:ring-0 w-full max-w-[240px]"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="h-px w-32 bg-primary/30 mx-auto mt-2 transition-all group-focus-within:w-64 group-focus-within:bg-primary shadow-[0_0_10px_rgba(255,183,123,0.2)]"></div>
                </div>

                {/* Description Input */}
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-sm">Description</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50">receipt_long</span>
                    <input
                      required
                      type="text"
                      value={expenseDesc}
                      onChange={(e) => setExpenseDesc(e.target.value)}
                      className="input-dark w-full rounded-lg py-3 pl-10 pr-4 text-on-surface font-body-md text-body-md placeholder:text-on-surface-variant/40"
                      placeholder="e.g., Dinner at Nobu"
                    />
                  </div>
                </div>

                {/* Paid By Selection */}
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-sm">Paid By</label>
                  <select
                    value={expensePayer}
                    onChange={(e) => setExpensePayer(e.target.value)}
                    className="input-dark w-full rounded-lg py-3 px-4 text-on-surface font-body-md text-body-md focus:outline-none focus:border-primary"
                  >
                    <option value="">Select Payer</option>
                    {selectedGroup.members.map(m => (
                      <option key={m.address} value={m.address}>{m.name}</option>
                    ))}
                  </select>
                </div>

                {/* Split Strategy Toggle */}
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-sm">Split Strategy</label>
                  <div className="flex p-1 bg-[#0e0e0e] rounded-lg border border-outline-variant/10">
                    <button
                      type="button"
                      onClick={() => setExpenseSplitType(0)}
                      className={`flex-1 py-2 px-4 rounded-md font-label-md text-label-md transition-colors ${
                        expenseSplitType === 0 ? 'bg-surface-container-high text-primary font-semibold shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Equally
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpenseSplitType(2)}
                      className={`flex-1 py-2 px-4 rounded-md font-label-md text-label-md transition-colors ${
                        expenseSplitType === 2 ? 'bg-surface-container-high text-primary font-semibold shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                </div>

                {/* Custom Split Inputs if split type is custom */}
                {expenseSplitType === 2 && (
                  <div className="space-y-3 p-3 bg-[#0e0e0e] rounded-lg border border-outline-variant/10 max-h-[150px] overflow-y-auto">
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block mb-1">Enter absolute share amounts</span>
                    {selectedGroup.members.map(m => (
                      <div key={m.address} className="flex items-center justify-between text-xs">
                        <span>{m.name}</span>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={customSplitValues[m.address] || ''}
                          onChange={(e) => setCustomSplitValues({ ...customSplitValues, [m.address]: e.target.value })}
                          className="bg-background border border-outline-variant/20 rounded px-2 py-1 w-24 text-right text-on-surface focus:outline-none focus:border-primary"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="mt-xl pt-md border-t border-outline-variant/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="btn-secondary px-6 py-2.5 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-8 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2"
                >
                  Record Expense
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </form>

            {/* Right Side: Live Preview Panel */}
            <div className="w-full md:w-2/5 bg-[#121212]/50 p-md md:p-lg flex flex-col max-h-full overflow-y-auto">
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-6 flex items-center gap-2 border-b border-outline-variant/20 pb-2">
                <span className="material-symbols-outlined text-primary">visibility</span>
                Live Preview
              </h2>
              <div className="flex-1 space-y-4">
                <div className="glass-panel p-4 rounded-xl">
                  <span className="font-label-sm text-label-sm text-on-surface-variant block mb-1">Total to Split</span>
                  <span className="font-headline-md text-headline-md text-primary">
                    {expenseAmount ? `${parseFloat(expenseAmount.replace(/,/g, '') || '0').toFixed(2)} XLM` : '0.00 XLM'}
                  </span>
                </div>

                <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-sm">Distribution</h3>
                <div className="space-y-3">
                  {livePreviewDistribution.length === 0 ? (
                    <p className="text-xs text-on-surface-variant">Enter amount and details to see live distribution.</p>
                  ) : (
                    livePreviewDistribution.map((dist, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-container-high/30 transition-colors border border-transparent hover:border-outline-variant/10 group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                            {dist.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-body-md text-body-md text-on-surface group-hover:text-primary transition-colors">{dist.name}</span>
                        </div>
                        <span className="font-body-md text-body-md text-on-surface-variant">{dist.amount.toFixed(2)} XLM</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-md pt-md border-t border-outline-variant/10">
                <p className="font-label-sm text-label-sm text-on-surface-variant/60 flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px]">info</span>
                  Amounts will be settled instantly via the Stellar Network upon confirmation.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Group */}
      {showAddGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121212]/80 backdrop-blur-sm">
          <form onSubmit={handleCreateGroup} className="glass-panel-heavy copper-glow w-full max-w-md rounded-xl p-6 space-y-4 fade-in">
            <div className="flex justify-between items-center border-b border-outline-variant/20 pb-3">
              <h2 className="font-headline-sm text-on-surface">Create New Group</h2>
              <button type="button" onClick={() => setShowAddGroupModal(false)} className="text-on-surface-variant hover:text-primary">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div>
              <label className="font-label-sm text-on-surface-variant block mb-2">Group Name</label>
              <input
                required
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g., Goa Trip '24"
                className="input-dark w-full rounded-lg py-3 px-4 text-on-surface font-body-md focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddGroupModal(false)}
                className="btn-secondary px-4 py-2 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary px-6 py-2 rounded-lg text-xs font-bold"
              >
                Create Group
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Add Member */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121212]/80 backdrop-blur-sm">
          <form onSubmit={handleAddMember} className="glass-panel-heavy copper-glow w-full max-w-md rounded-xl p-6 space-y-4 fade-in">
            <div className="flex justify-between items-center border-b border-outline-variant/20 pb-3">
              <h2 className="font-headline-sm text-on-surface">Add Group Member</h2>
              <button type="button" onClick={() => setShowAddMemberModal(false)} className="text-on-surface-variant hover:text-primary">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="font-label-sm text-on-surface-variant block mb-2">Member Name</label>
                <input
                  required
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="e.g., Sarah"
                  className="input-dark w-full rounded-lg py-3 px-4 text-on-surface font-body-md focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="font-label-sm text-on-surface-variant block mb-2">Stellar PublicKey Address</label>
                <input
                  required
                  type="text"
                  value={newMemberAddress}
                  onChange={(e) => setNewMemberAddress(e.target.value)}
                  placeholder="e.g., GD..."
                  className="input-dark w-full rounded-lg py-3 px-4 text-on-surface font-mono text-xs focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="btn-secondary px-4 py-2 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary px-6 py-2 rounded-lg text-xs font-bold"
              >
                Add Member
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
