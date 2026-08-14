import React from "react";
import type { Group, ActivityLog } from "../hooks/useContractsData";

interface DashboardViewProps {
  userAddress: string | null;
  groups: Group[];
  activityLogs: ActivityLog[];
  setActiveTab: (tab: string) => void;
  setShowCreateGroupModal: (show: boolean) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  userAddress,
  groups,
  activityLogs,
  setActiveTab,
  setShowCreateGroupModal
}) => {
  // Compute user metrics
  let totalOwed = 0;
  let totalOwe = 0;

  if (userAddress) {
    groups.forEach((g) => {
      g.debts.forEach((d) => {
        if (d.creditor === userAddress) {
          totalOwed += d.amount;
        } else if (d.debtor === userAddress) {
          totalOwe += d.amount;
        }
      });
    });
  }

  const netBalance = totalOwed - totalOwe;

  return (
    <div className="space-y-6 fade-in">
      {/* HEADER HERO */}
      <div className="glass-panel copper-border-top rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-black text-on-surface tracking-wide">
            Welcome back, {userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : "Stellar Auditor"}
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Real-time balance settlement driven by Soroban smart contracts.
          </p>
        </div>
        <button
          onClick={() => setShowCreateGroupModal(true)}
          className="copper-button flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black uppercase shadow-lg"
        >
          <span className="material-symbols-outlined text-sm font-bold">add</span>
          Create New Group
        </button>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <span className="material-symbols-outlined text-2xl">account_balance</span>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider">Net Balance</p>
            <h3 className={`text-xl font-black tracking-wide ${netBalance >= 0 ? "text-primary" : "text-[#EF4444]"}`}>
              {netBalance >= 0 ? "+" : ""}${netBalance.toFixed(2)}
            </h3>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20">
            <span className="material-symbols-outlined text-2xl">arrow_circle_up</span>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider">You Are Owed</p>
            <h3 className="text-xl font-black tracking-wide text-green-400">
              ${totalOwed.toFixed(2)}
            </h3>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 border border-red-500/20">
            <span className="material-symbols-outlined text-2xl">arrow_circle_down</span>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider">You Owe</p>
            <h3 className="text-xl font-black tracking-wide text-red-400">
              ${totalOwe.toFixed(2)}
            </h3>
          </div>
        </div>
      </div>

      {/* DETAILED STATS & RECENT ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* STATS */}
        <div className="glass-card rounded-2xl p-6 space-y-4 lg:col-span-1">
          <h4 className="text-sm font-extrabold text-on-surface border-b border-outline-variant/10 pb-3">Quick Navigation</h4>
          <div className="space-y-2">
            <button
              onClick={() => setActiveTab("groups")}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/5 text-xs text-on-surface font-semibold transition"
            >
              <span>Manage Shared Groups</span>
              <span className="material-symbols-outlined text-sm text-primary">arrow_forward</span>
            </button>
            <button
              onClick={() => setActiveTab("stellar")}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/5 text-xs text-on-surface font-semibold transition"
            >
              <span>Verify Smart Contracts</span>
              <span className="material-symbols-outlined text-sm text-primary">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* FEED */}
        <div className="glass-card rounded-2xl p-6 lg:col-span-2 space-y-4">
          <h4 className="text-sm font-extrabold text-on-surface border-b border-outline-variant/10 pb-3">Recent On-Chain Activity</h4>
          <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2">
            {activityLogs.length === 0 ? (
              <p className="text-xs text-on-surface-variant text-center py-6">No recent transactions recorded in this session.</p>
            ) : (
              activityLogs.map((log) => (
                <div key={log.id} className="flex gap-4 items-start text-xs border-b border-outline-variant/5 pb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                    <span className="material-symbols-outlined text-base">
                      {log.type === "group_created" && "group_add"}
                      {log.type === "member_joined" && "person_add"}
                      {log.type === "member_left" && "person_remove"}
                      {log.type === "expense_added" && "receipt_long"}
                      {log.type === "expense_deleted" && "delete"}
                      {log.type === "debt_settled" && "handshake"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-on-surface font-bold">{log.details}</p>
                    <div className="flex items-center gap-2 mt-1 font-mono text-[10px] text-on-surface-variant">
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span>•</span>
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${log.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline flex items-center gap-0.5"
                      >
                        {log.txHash.slice(0, 6)}...{log.txHash.slice(-4)}
                        <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
