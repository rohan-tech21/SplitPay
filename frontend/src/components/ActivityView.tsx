import React from "react";
import { Activity, Calendar, Hash, ExternalLink } from "lucide-react";
import type { ActivityLog } from "../hooks/useContractsData";

interface ActivityViewProps {
  activityLogs: ActivityLog[];
}

export const ActivityView: React.FC<ActivityViewProps> = ({ activityLogs }) => {
  return (
    <div className="premium-card rounded-2xl p-6 md:p-8 space-y-6 fade-in max-w-6xl mx-auto px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#B87333]/15 flex items-center justify-center text-[#B87333] border border-[rgba(184,115,51,0.25)]">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-black text-[#F7E7CE]">Ledger Activity Timeline</h2>
          <p className="text-xs text-stone-gray mt-1 leading-relaxed">
            Detailed log of operations executed on the Stellar ledger in the current browser session.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {activityLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Activity className="w-10 h-10 text-stone-gray/30" />
            <p className="text-xs text-stone-gray max-w-sm text-center leading-relaxed">
              No transactions recorded in this active session. Complete any group, expense addition, or debt settlement to push state updates to the network.
            </p>
          </div>
        ) : (
          activityLogs.map((log) => (
            <div
              key={log.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#121212]/50 border border-[rgba(247,231,206,0.05)] text-xs transition duration-200 hover:border-[rgba(184,115,51,0.3)]"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[#B87333]/15 border border-[rgba(184,115,51,0.25)] flex items-center justify-center text-[#B87333] font-bold shrink-0 mt-0.5 sm:mt-0">
                  <Activity className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0 space-y-1">
                  <span className="font-bold text-sm text-[#F7E7CE] block leading-normal">
                    {log.details}
                  </span>
                  
                  {/* Tx Hash with responsive display */}
                  <div className="flex items-center gap-1.5 font-mono text-[9px] text-stone-gray">
                    <Hash className="w-3 h-3 text-[#B87333]" />
                    <span>Tx Hash:</span>
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${log.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#B87333] hover:underline flex items-center gap-0.5 truncate"
                    >
                      <span className="hidden sm:inline">{log.txHash}</span>
                      <span className="inline sm:hidden">{log.txHash.slice(0, 10)}...{log.txHash.slice(-8)}</span>
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Timestamp */}
              <div className="flex items-center gap-1 text-stone-gray font-mono text-[10px] sm:text-right shrink-0">
                <Calendar className="w-3.5 h-3.5 text-stone-gray" />
                <span>{new Date(log.timestamp).toLocaleString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
