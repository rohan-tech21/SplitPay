import React from "react";
import type { ActivityLog } from "../hooks/useContractsData";

interface ActivityViewProps {
  activityLogs: ActivityLog[];
}

export const ActivityView: React.FC<ActivityViewProps> = ({ activityLogs }) => {
  return (
    <div className="glass-panel copper-border-top rounded-2xl p-6 md:p-8 space-y-6 fade-in">
      <div>
        <h2 className="text-xl font-black text-on-surface">Ledger Activity timeline</h2>
        <p className="text-xs text-on-surface-variant mt-1">
          Detailed log of operations executed on the Stellar ledger in the current browser session.
        </p>
      </div>

      <div className="space-y-4">
        {activityLogs.length === 0 ? (
          <p className="text-xs text-on-surface-variant text-center py-12">
            No activities recorded. Try creating a group, adding an expense, or settling a debt to write data on-chain.
          </p>
        ) : (
          activityLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-4 p-4 rounded-xl bg-surface-container/40 border border-outline-variant/5 text-xs transition hover:bg-surface-container/60"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                <span className="material-symbols-outlined text-lg">
                  {log.type === "group_created" && "group_add"}
                  {log.type === "member_joined" && "person_add"}
                  {log.type === "member_left" && "person_remove"}
                  {log.type === "expense_added" && "receipt_long"}
                  {log.type === "expense_deleted" && "delete"}
                  {log.type === "debt_settled" && "handshake"}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <span className="font-extrabold text-on-surface text-sm">{log.details}</span>
                  <span className="text-[10px] text-on-surface-variant font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-2 font-mono text-[10px] text-on-surface-variant">
                  <span>Tx Hash:</span>
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${log.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline flex items-center gap-0.5"
                  >
                    {log.txHash}
                    <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
