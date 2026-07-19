import React from "react";
import { Plus, ArrowUpRight, ArrowDownLeft, Scale, ArrowRight, Activity, ExternalLink, Calendar } from "lucide-react";
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
    <div className="space-y-6 fade-in max-w-6xl mx-auto px-4 sm:px-6">
      {/* HEADER HERO */}
      <div className="premium-card rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-[#F7E7CE] tracking-tight">
            Welcome back, {userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : "Stellar Auditor"}
          </h2>
          <p className="text-xs sm:text-sm text-stone-gray leading-relaxed">
            Real-time balance settlement driven by Soroban smart contracts.
          </p>
        </div>
        <button
          onClick={() => setShowCreateGroupModal(true)}
          className="btn-primary flex items-center gap-2 px-5 py-3 rounded-xl text-xs uppercase tracking-wide cursor-pointer w-full md:w-auto justify-center"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Create New Group</span>
        </button>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {/* NET BALANCE */}
        <div className="premium-card rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#B87333]/15 flex items-center justify-center text-[#B87333] border border-[rgba(184,115,51,0.25)]">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-stone-gray font-mono uppercase tracking-wider">Net Balance</p>
            <h3 className={`text-lg sm:text-xl font-black tracking-tight ${netBalance >= 0 ? "text-[#B87333]" : "text-rose-500"}`}>
              {netBalance >= 0 ? "+" : ""}${netBalance.toFixed(2)}
            </h3>
          </div>
        </div>

        {/* YOU ARE OWED */}
        <div className="premium-card rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#355E3B]/15 flex items-center justify-center text-[#A4D2A6] border border-[#355E3B]/35">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-stone-gray font-mono uppercase tracking-wider">You Are Owed</p>
            <h3 className="text-lg sm:text-xl font-black tracking-tight text-[#A4D2A6]">
              ${totalOwed.toFixed(2)}
            </h3>
          </div>
        </div>

        {/* YOU OWE */}
        <div className="premium-card rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-stone-gray font-mono uppercase tracking-wider">You Owe</p>
            <h3 className="text-lg sm:text-xl font-black tracking-tight text-rose-400">
              ${totalOwe.toFixed(2)}
            </h3>
          </div>
        </div>
      </div>

      {/* GRID SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* QUICK NAVIGATION */}
        <div className="premium-card rounded-2xl p-6 space-y-4 lg:col-span-1 flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-xs font-bold font-mono text-stone-gray uppercase tracking-wider border-b border-[rgba(247,231,206,0.08)] pb-2">
              Quick Actions
            </h4>
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab("groups")}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#121212]/80 hover:bg-[#B87333]/5 border border-[rgba(247,231,206,0.08)] hover:border-[rgba(184,115,51,0.3)] text-xs text-[#F7E7CE] font-bold transition-all duration-200"
              >
                <span>Manage Shared Groups</span>
                <ArrowRight className="w-4 h-4 text-[#B87333]" />
              </button>
              <button
                onClick={() => setActiveTab("stellar")}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#121212]/80 hover:bg-[#B87333]/5 border border-[rgba(247,231,206,0.08)] hover:border-[rgba(184,115,51,0.3)] text-xs text-[#F7E7CE] font-bold transition-all duration-200"
              >
                <span>Verify Smart Contracts</span>
                <ArrowRight className="w-4 h-4 text-[#B87333]" />
              </button>
            </div>
          </div>
          
          <div className="pt-6 hidden lg:block">
            <div className="p-4 rounded-xl bg-[#121212]/50 border border-[rgba(184,115,51,0.1)] text-[11px] text-stone-gray leading-relaxed flex gap-2.5 items-start">
              <Activity className="w-4 h-4 text-[#B87333] shrink-0 mt-0.5" />
              <span>
                All settlements, additions, and group creations generate immediate events on the Soroban consensus layer.
              </span>
            </div>
          </div>
        </div>

        {/* TRANSACTION FEED */}
        <div className="premium-card rounded-2xl p-6 lg:col-span-2 space-y-4">
          <h4 className="text-xs font-bold font-mono text-stone-gray uppercase tracking-wider border-b border-[rgba(247,231,206,0.08)] pb-2">
            Recent On-Chain Activity
          </h4>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {activityLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-2">
                <Activity className="w-8 h-8 text-stone-gray/40" />
                <p className="text-xs text-stone-gray">No transactions recorded in this active session.</p>
              </div>
            ) : (
              activityLogs.map((log) => (
                <div key={log.id} className="flex gap-4 items-start text-xs border-b border-[rgba(247,231,206,0.05)] pb-3.5 last:border-b-0 last:pb-0">
                  <div className="w-8 h-8 rounded-lg bg-[#B87333]/15 border border-[rgba(184,115,51,0.25)] flex items-center justify-center text-[#B87333] font-bold shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#F7E7CE] font-bold leading-normal">{log.details}</p>
                    <div className="flex items-center gap-2 mt-1.5 font-mono text-[9px] text-stone-gray">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span>•</span>
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${log.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#B87333] hover:underline flex items-center gap-0.5"
                      >
                        {log.txHash.slice(0, 6)}...{log.txHash.slice(-4)}
                        <ExternalLink className="w-2.5 h-2.5" />
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
