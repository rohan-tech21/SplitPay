import React from "react";
import { CONTRACTS, RPC_URL, NETWORK_PASSPHRASE } from "../contracts/config";

export const StellarHubView: React.FC = () => {
  return (
    <div className="space-y-6 fade-in">
      {/* VERIFIABILITY CARD */}
      <div className="glass-panel copper-border-top rounded-2xl p-6 md:p-8 space-y-4">
        <h2 className="text-xl font-black text-on-surface">30-Second Verification Hub</h2>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          Every group creation, expense addition, split division, and debt settlement is executed through decentralised 
          Soroban smart contracts compiled to WebAssembly (WASM) and deployed on the public Stellar Testnet. 
          No off-chain databases, database servers, or caching is used as a source of truth.
        </p>
      </div>

      {/* CONTRACT ADDRESSES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h3 className="text-xs font-extrabold text-on-surface uppercase tracking-wider">Smart Contracts (Testnet)</h3>
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 bg-surface-container/60 rounded-xl border border-outline-variant/5">
              <span className="text-[10px] text-on-surface-variant block uppercase font-bold mb-1">GroupManager</span>
              <a
                href={`https://stellar.expert/explorer/testnet/contract/${CONTRACTS.groupManager}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline break-all"
              >
                {CONTRACTS.groupManager}
              </a>
            </div>

            <div className="p-3 bg-surface-container/60 rounded-xl border border-outline-variant/5">
              <span className="text-[10px] text-on-surface-variant block uppercase font-bold mb-1">ExpenseManager</span>
              <a
                href={`https://stellar.expert/explorer/testnet/contract/${CONTRACTS.expenseManager}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline break-all"
              >
                {CONTRACTS.expenseManager}
              </a>
            </div>

            <div className="p-3 bg-surface-container/60 rounded-xl border border-outline-variant/5">
              <span className="text-[10px] text-on-surface-variant block uppercase font-bold mb-1">SettlementManager</span>
              <a
                href={`https://stellar.expert/explorer/testnet/contract/${CONTRACTS.settlementManager}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline break-all"
              >
                {CONTRACTS.settlementManager}
              </a>
            </div>

            <div className="p-3 bg-surface-container/60 rounded-xl border border-outline-variant/5">
              <span className="text-[10px] text-on-surface-variant block uppercase font-bold mb-1">Native Token (XLM SAC)</span>
              <a
                href={`https://stellar.expert/explorer/testnet/contract/${CONTRACTS.xlmToken}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline break-all"
              >
                {CONTRACTS.xlmToken}
              </a>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h3 className="text-xs font-extrabold text-on-surface uppercase tracking-wider">Network & Node Connection</h3>
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 bg-surface-container/60 rounded-xl border border-outline-variant/5">
              <span className="text-[10px] text-on-surface-variant block uppercase font-bold mb-1">RPC Endpoint</span>
              <span className="text-on-surface select-all">{RPC_URL}</span>
            </div>

            <div className="p-3 bg-surface-container/60 rounded-xl border border-outline-variant/5">
              <span className="text-[10px] text-on-surface-variant block uppercase font-bold mb-1">Network Passphrase</span>
              <span className="text-on-surface select-all">{NETWORK_PASSPHRASE}</span>
            </div>

            <div className="p-3 bg-surface-container/60 rounded-xl border border-outline-variant/5">
              <span className="text-[10px] text-on-surface-variant block uppercase font-bold mb-1">Fee & Resource Strategy</span>
              <span className="text-on-surface">Auto-simulation via RPC node; dynamically computed footprints.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
