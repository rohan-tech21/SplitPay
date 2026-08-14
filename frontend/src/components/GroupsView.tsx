import React, { useState } from "react";
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start fade-in">
      {/* SIDEBAR: GROUPS LIST */}
      <div className="glass-card rounded-2xl p-6 space-y-4 md:col-span-1">
        <h3 className="text-sm font-extrabold text-on-surface border-b border-outline-variant/10 pb-3 uppercase tracking-wider">
          Shared Groups
        </h3>
        <div className="space-y-3">
          {groups.length === 0 ? (
            <p className="text-xs text-on-surface-variant text-center py-6">No groups created yet.</p>
          ) : (
            groups.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  setSelectedGroupId(g.id);
                  setValidationError(null);
                }}
                className={`w-full text-left p-4 rounded-xl transition border ${
                  selectedGroupId === g.id
                    ? "border-primary bg-primary/5 text-on-surface shadow-md"
                    : "border-outline-variant/10 bg-surface-container hover:bg-surface-container-high text-on-surface-variant"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-sm">{g.name}</span>
                  <span className="text-[10px] font-mono bg-surface-container px-2 py-0.5 rounded border border-outline-variant/10 text-primary">
                    ID #{g.id}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2 text-[10px] font-mono">
                  <span>{g.members.length} members</span>
                  <span>{g.expenses.length} expenses</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* DETAIL VIEW */}
      <div className="md:col-span-2 space-y-6">
        {selectedGroup ? (
          <div className="space-y-6">
            {/* GROUP SUMMARY */}
            <div className="glass-panel rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-outline-variant/10 pb-4">
                <div>
                  <h2 className="text-xl font-black text-on-surface">{selectedGroup.name}</h2>
                  <p className="text-[10px] text-on-surface-variant font-mono mt-1">
                    Created by {selectedGroup.creator.slice(0, 6)}...{selectedGroup.creator.slice(-4)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!selectedGroup.members.includes(userAddress || "") ? (
                    <button
                      disabled={loading}
                      onClick={() => onJoinGroup(selectedGroup.id)}
                      className="btn-primary px-4 py-2 rounded-lg text-xs font-bold"
                    >
                      Join Group
                    </button>
                  ) : (
                    <>
                      {selectedGroup.creator !== userAddress && (
                        <button
                          disabled={loading}
                          onClick={() => onLeaveGroup(selectedGroup.id)}
                          className="btn-secondary px-4 py-2 rounded-lg text-xs font-bold text-red-400 border-red-500/20 hover:bg-red-500/10"
                        >
                          Leave Group
                        </button>
                      )}
                      <button
                        onClick={() => setShowAddMember(true)}
                        className="btn-secondary px-4 py-2 rounded-lg text-xs font-bold"
                      >
                        Add Member
                      </button>
                      <button
                        onClick={() => setShowAddExpense(true)}
                        className="btn-primary px-4 py-2 rounded-lg text-xs font-bold"
                      >
                        Add Expense
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* MEMBERS */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-on-surface uppercase tracking-wider">Group Members</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedGroup.members.map((member) => (
                    <span
                      key={member}
                      className={`text-[10px] font-mono px-3 py-1.5 rounded-lg border ${
                        member === userAddress
                          ? "border-primary bg-primary/10 text-primary font-bold"
                          : "border-outline-variant/10 bg-[#161616] text-on-surface-variant"
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* EXPENSE LIST */}
              <div className="glass-card rounded-2xl p-6 space-y-4">
                <h3 className="text-xs font-extrabold text-on-surface border-b border-outline-variant/10 pb-3 uppercase tracking-wider">
                  Expenses
                </h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {selectedGroup.expenses.length === 0 ? (
                    <p className="text-xs text-on-surface-variant text-center py-6">No expenses added yet.</p>
                  ) : (
                    selectedGroup.expenses.map((exp) => (
                      <div
                        key={exp.id}
                        className="p-3.5 rounded-xl bg-surface-container/60 border border-outline-variant/5 text-xs space-y-2"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-extrabold text-on-surface block">{exp.description}</span>
                            <span className="text-[10px] text-on-surface-variant font-mono">
                              Paid by {exp.paidBy.slice(0, 6)}...{exp.paidBy.slice(-4)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-extrabold text-primary block">${exp.amount.toFixed(2)}</span>
                            {exp.paidBy === userAddress && (
                              <button
                                disabled={loading}
                                onClick={() => onDeleteExpense(selectedGroup.id, exp.id)}
                                className="text-[10px] text-red-400 hover:underline mt-1 flex items-center gap-0.5 ml-auto"
                              >
                                <span className="material-symbols-outlined text-[10px]">delete</span>
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* SETTLEMENT / DEBT NETTING */}
              <div className="glass-card rounded-2xl p-6 space-y-4">
                <h3 className="text-xs font-extrabold text-on-surface border-b border-outline-variant/10 pb-3 uppercase tracking-wider">
                  Balances & Settlement
                </h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {selectedGroup.debts.length === 0 ? (
                    <p className="text-xs text-on-surface-variant text-center py-6">All settled up! No active debts.</p>
                  ) : (
                    selectedGroup.debts.map((debt, index) => {
                      const isDebtor = debt.debtor === userAddress;
                      return (
                        <div
                          key={index}
                          className="p-3.5 rounded-xl bg-surface-container/60 border border-outline-variant/5 text-xs space-y-3"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-bold text-on-surface">
                                {debt.debtor.slice(0, 6)}...{debt.debtor.slice(-4)}
                              </span>
                              <span className="text-on-surface-variant mx-1.5">owes</span>
                              <span className="font-bold text-on-surface">
                                {debt.creditor.slice(0, 6)}...{debt.creditor.slice(-4)}
                              </span>
                            </div>
                            <span className="font-extrabold text-primary">${debt.amount.toFixed(2)}</span>
                          </div>

                          {isDebtor && (
                            <div className="flex gap-2 justify-end">
                              <button
                                disabled={loading}
                                onClick={() => onSettleDebtManual(selectedGroup.id, debt.creditor, debt.amount)}
                                className="btn-secondary px-3 py-1.5 rounded-lg text-[10px] font-bold"
                              >
                                Settle Manual
                              </button>
                              <button
                                disabled={loading}
                                onClick={() => onSettleDebtToken(selectedGroup.id, debt.creditor, debt.amount)}
                                className="btn-primary px-3 py-1.5 rounded-lg text-[10px] font-bold"
                              >
                                Settle with XLM
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
          <div className="glass-card rounded-2xl p-12 text-center text-on-surface-variant space-y-2">
            <span className="material-symbols-outlined text-4xl text-primary">groups</span>
            <h3 className="font-extrabold text-sm text-on-surface">Select a Group</h3>
            <p className="text-xs max-w-md mx-auto">
              Choose a group from the sidebar to view participants, shared ledger of expenses, and netted balances.
            </p>
          </div>
        )}
      </div>

      {/* MODAL: ADD MEMBER */}
      {showAddMember && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121212]/80 backdrop-blur-sm">
          <form onSubmit={handleAddMemberSubmit} className="glass-panel-heavy border-copper w-full max-w-md rounded-xl p-6 space-y-4 fade-in border">
            <div className="flex justify-between items-center border-b border-outline-variant/10 pb-3">
              <h2 className="font-extrabold text-sm text-on-surface">Add Group Member</h2>
              <button type="button" onClick={() => setShowAddMember(false)} className="text-on-surface-variant hover:text-primary">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider block mb-2">Stellar PublicKey Address</label>
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
                onClick={() => setShowAddMember(false)}
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

      {/* MODAL: ADD EXPENSE */}
      {showAddExpense && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121212]/80 backdrop-blur-sm">
          <form onSubmit={handleAddExpenseSubmit} className="glass-panel-heavy border-copper w-full max-w-lg rounded-xl p-6 space-y-4 fade-in border">
            <div className="flex justify-between items-center border-b border-outline-variant/10 pb-3">
              <h2 className="font-extrabold text-sm text-on-surface">Add Shared Expense</h2>
              <button type="button" onClick={() => setShowAddExpense(false)} className="text-on-surface-variant hover:text-primary">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider block mb-2">Description</label>
                <input
                  required
                  type="text"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="e.g., Dinner at Aurelia"
                  className="input-dark w-full rounded-lg py-2.5 px-4 text-on-surface text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider block mb-2">Total Amount ($)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={expenseAmt}
                  onChange={(e) => setExpenseAmt(e.target.value)}
                  placeholder="0.00"
                  className="input-dark w-full rounded-lg py-2.5 px-4 text-on-surface text-xs focus:outline-none focus:border-primary"
                />
              </div>

              {/* Split type selector */}
              <div>
                <label className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider block mb-2">Split Type</label>
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
                      className={`py-2 rounded-lg text-xs font-bold border transition ${
                        splitType === idx
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-outline-variant/10 bg-surface-container text-on-surface-variant hover:text-primary"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom / Percentage Inputs */}
              {splitType > 0 && (
                <div className="space-y-3 bg-[#161616] p-4 rounded-xl border border-outline-variant/5">
                  <h4 className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider">
                    {splitType === 1 ? "Assign Percentages (%)" : "Assign Custom Amounts ($)"}
                  </h4>
                  <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                    {selectedGroup.members.map((m) => (
                      <div key={m} className="flex justify-between items-center gap-4 text-xs font-mono">
                        <span className="text-on-surface-variant truncate max-w-[200px]">
                          {m.slice(0, 6)}...{m.slice(-4)} {m === userAddress ? "(You)" : ""}
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
                            className="input-dark w-24 text-right rounded-lg py-1 px-2.5 text-on-surface focus:outline-none focus:border-primary text-xs"
                          />
                          <span>{splitType === 1 ? "%" : "$"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {validationError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-semibold">
                  {validationError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddExpense(false)}
                className="btn-secondary px-4 py-2 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary px-6 py-2 rounded-lg text-xs font-bold"
              >
                Submit Expense
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
