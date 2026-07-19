import React, { useState } from "react";
import { Users, Plus, UserPlus, DollarSign, Trash2, LogOut, FileText, Landmark, X, ShieldAlert, ArrowUpRight, Coins } from "lucide-react";
import type { Group } from "../hooks/useContractsData";

interface GroupsViewProps {
  userAddress: string | null;
  groups: Group[];
  loading: boolean;
  onJoinGroup: (groupId: number) => Promise<void>;
  onLeaveGroup: (groupId: number) => Promise<void>;
  onAddMember: (groupId: number, address: string) => Promise<void>;
  onAddExpense: (
    groupId: number,
    description: string,
    amount: number,
    splitType: number,
    splits: { member: string; value: number }[]
  ) => Promise<void>;
  onDeleteExpense: (groupId: number, expenseId: number) => Promise<void>;
  onSettleDebtManual: (groupId: number, creditor: string, amount: number) => Promise<void>;
  onSettleDebtToken: (groupId: number, creditor: string, amount: number) => Promise<void>;
}

export const GroupsView: React.FC<GroupsViewProps> = ({
  userAddress,
  groups,
  loading,
  onJoinGroup,
  onLeaveGroup,
  onAddMember,
  onAddExpense,
  onDeleteExpense,
  onSettleDebtManual,
  onSettleDebtToken
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  
  // Modals state
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberAddress, setNewMemberAddress] = useState("");
  
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmt, setExpenseAmt] = useState("");
  const [splitType, setSplitType] = useState(0); // 0=Equal, 1=Percentage, 2=Custom
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) || null;

  // Handle Add Member submit
  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !newMemberAddress) return;
    try {
      await onAddMember(selectedGroup.id, newMemberAddress.trim());
      setShowAddMember(false);
      setNewMemberAddress("");
    } catch (err) {
      // Error handled by hook
    }
  };

  // Prepare split values based on type
  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !expenseDesc || !expenseAmt) return;
    setValidationError(null);

    const amt = parseFloat(expenseAmt);
    if (isNaN(amt) || amt <= 0) {
      setValidationError("Amount must be a positive number");
      return;
    }

    const members = selectedGroup.members;
    let finalSplits: { member: string; value: number }[] = [];

    if (splitType === 0) {
      // Equal Split
      const splitValue = amt / members.length;
      finalSplits = members.map((m) => ({ member: m, value: splitValue }));
    } else if (splitType === 1) {
      // Percentage Split
      let pctSum = 0;
      const pcts = members.map((m) => {
        const val = parseFloat(customSplits[m] || "0");
        pctSum += val;
        return { member: m, value: val };
      });

      if (Math.abs(pctSum - 100) > 0.01) {
        setValidationError(`Percentages must sum to exactly 100% (currently ${pctSum}%)`);
        return;
      }

      finalSplits = pcts.map((p) => ({
        member: p.member,
        value: (p.value / 100) * amt
      }));
    } else {
      // Custom Split
      let amtSum = 0;
      const amts = members.map((m) => {
        const val = parseFloat(customSplits[m] || "0");
        amtSum += val;
        return { member: m, value: val };
      });

      if (Math.abs(amtSum - amt) > 0.01) {
        setValidationError(`Split amounts must sum to exactly the expense amount of $${amt.toFixed(2)} (currently $${amtSum.toFixed(2)})`);
        return;
      }

      finalSplits = amts;
    }

    try {
      await onAddExpense(selectedGroup.id, expenseDesc, amt, splitType, finalSplits);
      setShowAddExpense(false);
      setExpenseDesc("");
      setExpenseAmt("");
      setCustomSplits({});
    } catch (err) {
      // Error handled by hook
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start fade-in">
        {/* SIDEBAR: GROUPS LIST */}
        <div className="premium-card rounded-2xl p-5 space-y-4 lg:col-span-1">
          <div className="flex items-center gap-2 border-b border-[rgba(247,231,206,0.08)] pb-3">
            <Users className="w-4 h-4 text-[#B87333]" />
            <h3 className="text-xs font-bold font-mono text-stone-gray uppercase tracking-wider">
              Shared Groups
            </h3>
          </div>
          <div className="space-y-2.5">
            {groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-2">
                <Users className="w-8 h-8 text-stone-gray/30" />
                <p className="text-xs text-stone-gray">No shared groups registered yet.</p>
              </div>
            ) : (
              groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    setSelectedGroupId(g.id);
                    setValidationError(null);
                  }}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-200 border cursor-pointer ${
                    selectedGroupId === g.id
                      ? "border-[#B87333] bg-[#B87333]/5 text-[#F7E7CE] shadow-sm"
                      : "border-[rgba(247,231,206,0.08)] bg-[#1A1A1A]/50 hover:bg-[#1A1A1A] text-stone-gray hover:text-[#F7E7CE]"
                  }`}
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-bold text-xs truncate">{g.name}</span>
                    <span className="text-[9px] font-mono bg-[#121212] px-2 py-0.5 rounded border border-[rgba(184,115,51,0.2)] text-[#B87333] shrink-0">
                      ID #{g.id}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2.5 text-[9px] font-mono text-stone-gray">
                    <span>{g.members.length} members</span>
                    <span>{g.expenses.length} expenses</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* DETAIL VIEW */}
        <div className="lg:col-span-2 space-y-6">
          {selectedGroup ? (
            <div className="space-y-6">
              {/* GROUP SUMMARY */}
              <div className="premium-card rounded-2xl p-6 space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[rgba(247,231,206,0.08)] pb-4">
                  <div className="space-y-1">
                    <h2 className="text-lg sm:text-xl font-black text-[#F7E7CE]">{selectedGroup.name}</h2>
                    <p className="text-[10px] text-stone-gray font-mono">
                      Created by {selectedGroup.creator.slice(0, 8)}...{selectedGroup.creator.slice(-6)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    {!selectedGroup.members.includes(userAddress || "") ? (
                      <button
                        disabled={loading}
                        onClick={() => onJoinGroup(selectedGroup.id)}
                        className="btn-primary px-4 py-2 rounded-xl text-xs flex-1 sm:flex-none justify-center"
                      >
                        Join Group
                      </button>
                    ) : (
                      <>
                        {selectedGroup.creator !== userAddress && (
                          <button
                            disabled={loading}
                            onClick={() => onLeaveGroup(selectedGroup.id)}
                            className="btn-secondary px-4 py-2 rounded-xl text-xs text-rose-400 border-rose-500/20 hover:bg-rose-500/10 flex-1 sm:flex-none justify-center flex items-center gap-1.5"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Leave</span>
                          </button>
                        )}
                        <button
                          onClick={() => setShowAddMember(true)}
                          className="btn-secondary px-4 py-2 rounded-xl text-xs flex-1 sm:flex-none justify-center flex items-center gap-1.5"
                        >
                          <UserPlus className="w-3.5 h-3.5 text-[#B87333]" />
                          <span>Add Member</span>
                        </button>
                        <button
                          onClick={() => setShowAddExpense(true)}
                          className="btn-primary px-4 py-2 rounded-xl text-xs flex-1 sm:flex-none justify-center flex items-center gap-1.5"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Add Expense</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* MEMBERS LIST */}
                <div className="space-y-2">
                  <h4 className="text-[10px] text-stone-gray font-mono uppercase tracking-wider">Group Members</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedGroup.members.map((member) => (
                      <span
                        key={member}
                        className={`text-[10px] font-mono px-3 py-1.5 rounded-lg border ${
                          member === userAddress
                            ? "border-[#B87333] bg-[#B87333]/10 text-[#B87333] font-bold"
                            : "border-[rgba(247,231,206,0.08)] bg-[#121212] text-stone-gray"
                        }`}
                      >
                        {member === userAddress
                          ? `You (${member.slice(0, 6)}...${member.slice(-4)})`
                          : `${member.slice(0, 6)}...${member.slice(-4)}`}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* EXPENSES & SETTLEMENTS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* EXPENSE TIMELINE */}
                <div className="premium-card rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-[rgba(247,231,206,0.08)] pb-2.5">
                    <FileText className="w-4 h-4 text-[#B87333]" />
                    <h3 className="text-xs font-bold font-mono text-stone-gray uppercase tracking-wider">
                      Expense Log
                    </h3>
                  </div>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {selectedGroup.expenses.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-stone-gray">
                        <FileText className="w-6 h-6 text-stone-gray/30 mb-1" />
                        <p className="text-xs">No expenses added yet.</p>
                      </div>
                    ) : (
                      selectedGroup.expenses.map((exp) => (
                        <div
                          key={exp.id}
                          className="p-3.5 rounded-xl bg-[#121212]/50 border border-[rgba(247,231,206,0.05)] text-xs space-y-2.5"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div className="min-w-0">
                              <span className="font-bold text-[#F7E7CE] block truncate">{exp.description}</span>
                              <span className="text-[10px] text-stone-gray font-mono block mt-0.5">
                                Paid by {exp.paidBy.slice(0, 6)}...{exp.paidBy.slice(-4)}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-black text-[#B87333] text-sm block">${exp.amount.toFixed(2)}</span>
                              {exp.paidBy === userAddress && (
                                <button
                                  disabled={loading}
                                  onClick={() => onDeleteExpense(selectedGroup.id, exp.id)}
                                  className="text-[10px] text-rose-400 hover:underline mt-1.5 flex items-center gap-1 ml-auto cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* DEBT NETTING & SETTLEMENTS */}
                <div className="premium-card rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-[rgba(247,231,206,0.08)] pb-2.5">
                    <Landmark className="w-4 h-4 text-[#B87333]" />
                    <h3 className="text-xs font-bold font-mono text-stone-gray uppercase tracking-wider">
                      Balances & Netting
                    </h3>
                  </div>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {selectedGroup.debts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-stone-gray">
                        <Coins className="w-6 h-6 text-stone-gray/30 mb-1" />
                        <p className="text-xs">No active debts. Fully settled!</p>
                      </div>
                    ) : (
                      selectedGroup.debts.map((debt, index) => {
                        const isDebtor = debt.debtor === userAddress;
                        return (
                          <div
                            key={index}
                            className="p-3.5 rounded-xl bg-[#121212]/50 border border-[rgba(247,231,206,0.05)] text-xs space-y-3"
                          >
                            <div className="flex justify-between items-center gap-4">
                              <div className="min-w-0 truncate">
                                <span className="font-bold text-[#F7E7CE]">
                                  {debt.debtor.slice(0, 6)}...{debt.debtor.slice(-4)}
                                </span>
                                <span className="text-stone-gray mx-1.5">owes</span>
                                <span className="font-bold text-[#F7E7CE]">
                                  {debt.creditor.slice(0, 6)}...{debt.creditor.slice(-4)}
                                </span>
                              </div>
                              <span className="font-extrabold text-[#B87333] shrink-0">${debt.amount.toFixed(2)}</span>
                            </div>

                            {isDebtor && (
                              <div className="flex gap-2 justify-end">
                                <button
                                  disabled={loading}
                                  onClick={() => onSettleDebtManual(selectedGroup.id, debt.creditor, debt.amount)}
                                  className="btn-secondary px-3 py-1.5 rounded-lg text-[9px] font-bold cursor-pointer"
                                >
                                  Settle Manual
                                </button>
                                <button
                                  disabled={loading}
                                  onClick={() => onSettleDebtToken(selectedGroup.id, debt.creditor, debt.amount)}
                                  className="btn-primary px-3 py-1.5 rounded-lg text-[9px] font-bold cursor-pointer flex items-center gap-1"
                                >
                                  <ArrowUpRight className="w-3 h-3" />
                                  <span>Settle XLM</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="premium-card rounded-2xl p-12 text-center text-stone-gray space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#B87333]/10 flex items-center justify-center text-[#B87333] mx-auto border border-[rgba(184,115,51,0.2)]">
                <Users className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-sm text-[#F7E7CE]">Select a shared workspace group</h3>
                <p className="text-xs max-w-sm mx-auto leading-relaxed">
                  Choose or create a shared space from the registry sidebar to audit transactions, members, and netted debt graphs.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ADD MEMBER */}
      {showAddMember && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121212]/85 backdrop-blur-md">
          <form onSubmit={handleAddMemberSubmit} className="premium-card w-full max-w-md rounded-2xl p-6 space-y-5 fade-in">
            <div className="flex justify-between items-center border-b border-[rgba(247,231,206,0.08)] pb-3">
              <h2 className="font-bold text-sm text-[#F7E7CE]">Add Group Member</h2>
              <button
                type="button"
                onClick={() => setShowAddMember(false)}
                className="text-stone-gray hover:text-[#B87333] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] text-stone-gray font-mono uppercase tracking-wider block">
                  Stellar PublicKey Address
                </label>
                <input
                  required
                  type="text"
                  value={newMemberAddress}
                  onChange={(e) => setNewMemberAddress(e.target.value)}
                  placeholder="e.g., GBRPY..."
                  className="input-premium w-full rounded-xl py-3 px-4 font-mono text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowAddMember(false)}
                className="btn-secondary px-4 py-2 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary px-5 py-2 rounded-xl text-xs flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{loading ? "Adding..." : "Add Member"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ADD EXPENSE */}
      {showAddExpense && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121212]/85 backdrop-blur-md">
          <form onSubmit={handleAddExpenseSubmit} className="premium-card w-full max-w-lg rounded-2xl p-6 space-y-5 fade-in">
            <div className="flex justify-between items-center border-b border-[rgba(247,231,206,0.08)] pb-3">
              <h2 className="font-bold text-sm text-[#F7E7CE]">Add Shared Expense</h2>
              <button
                type="button"
                onClick={() => setShowAddExpense(false)}
                className="text-stone-gray hover:text-[#B87333] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] text-stone-gray font-mono uppercase tracking-wider block">Description</label>
                <input
                  required
                  type="text"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="e.g., Server hosting / dinners"
                  className="input-premium w-full rounded-xl py-2.5 px-4 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] text-stone-gray font-mono uppercase tracking-wider block">Total Amount ($)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={expenseAmt}
                  onChange={(e) => setExpenseAmt(e.target.value)}
                  placeholder="0.00"
                  className="input-premium w-full rounded-xl py-2.5 px-4 text-xs"
                />
              </div>

              {/* Split type selector */}
              <div className="space-y-1.5">
                <label className="text-[9px] text-stone-gray font-mono uppercase tracking-wider block">Split Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Equal", "Percentage", "Custom"].map((label, idx) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        setSplitType(idx);
                        setValidationError(null);
                        setCustomSplits({});
                      }}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all duration-200 cursor-pointer ${
                        splitType === idx
                          ? "border-[#B87333] bg-[#B87333]/15 text-[#B87333]"
                          : "border-[rgba(247,231,206,0.08)] bg-[#1A1A1A]/80 text-stone-gray hover:text-[#B87333]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom / Percentage Inputs */}
              {splitType > 0 && (
                <div className="space-y-3 bg-[#121212] p-4 rounded-xl border border-[rgba(247,231,206,0.05)]">
                  <h4 className="text-[9px] text-stone-gray font-mono uppercase tracking-wider">
                    {splitType === 1 ? "Assign Percentages (%)" : "Assign Custom Amounts ($)"}
                  </h4>
                  <div className="space-y-2.5 max-h-[150px] overflow-y-auto pr-1">
                    {selectedGroup.members.map((m) => (
                      <div key={m} className="flex justify-between items-center gap-4 text-xs font-mono">
                        <span className="text-stone-gray truncate max-w-[200px]">
                          {m.slice(0, 8)}...{m.slice(-6)} {m === userAddress ? "(You)" : ""}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="any"
                            value={customSplits[m] || ""}
                            onChange={(e) => {
                              setCustomSplits({
                                ...customSplits,
                                [m]: e.target.value
                              });
                            }}
                            placeholder="0"
                            className="input-premium w-24 text-right rounded-lg py-1 px-2 text-xs"
                          />
                          <span className="text-stone-gray text-[10px] font-bold">{splitType === 1 ? "%" : "$"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {validationError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold flex gap-2 items-start">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{validationError}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowAddExpense(false)}
                className="btn-secondary px-4 py-2 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary px-5 py-2 rounded-xl text-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{loading ? "Submitting..." : "Submit Expense"}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
