import React from "react";
import { ShieldCheck, Cpu, Globe, ExternalLink, Compass } from "lucide-react";
import { CONTRACTS, RPC_URL, NETWORK_PASSPHRASE } from "../contracts/config";

export const StellarHubView: React.FC = () => {
  return (
    <div className="space-y-6 fade-in max-w-6xl mx-auto px-4 sm:px-6">
      {/* VERIFIABILITY CARD */}
      <div className="premium-card rounded-2xl p-6 md:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#355E3B]/10 flex items-center justify-center text-[#A4D2A6] border border-[#355E3B]/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="text-lg sm:text-xl font-black text-[#F7E7CE]">30-Second Verification Hub</h2>
        </div>
        <p className="text-xs sm:text-sm text-stone-gray leading-relaxed max-w-4xl">
          Every group creation, expense addition, split division, and debt settlement is executed through decentralized 
          Soroban smart contracts compiled to WebAssembly (WASM) and deployed on the public Stellar Testnet. 
          No off-chain databases, database servers, or caching is used as a source of truth.
        </p>
      </div>

      {/* CONTRACT ADDRESSES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="premium-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[rgba(247,231,206,0.08)] pb-2.5">
            <Cpu className="w-4 h-4 text-[#B87333]" />
            <h3 className="text-xs font-bold font-mono text-stone-gray uppercase tracking-wider">
              Smart Contracts (Testnet)
            </h3>
          </div>
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 bg-[#121212]/50 rounded-xl border border-[rgba(247,231,206,0.05)]">
              <span className="text-[10px] text-stone-gray block uppercase font-bold mb-1.5">GroupManager</span>
              <a
                href={`https://stellar.expert/explorer/testnet/contract/${CONTRACTS.groupManager}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#B87333] hover:underline break-all flex items-center gap-1.5"
              >
                <span className="truncate">{CONTRACTS.groupManager}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>

            <div className="p-3 bg-[#121212]/50 rounded-xl border border-[rgba(247,231,206,0.05)]">
              <span className="text-[10px] text-stone-gray block uppercase font-bold mb-1.5">ExpenseManager</span>
              <a
                href={`https://stellar.expert/explorer/testnet/contract/${CONTRACTS.expenseManager}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#B87333] hover:underline break-all flex items-center gap-1.5"
              >
                <span className="truncate">{CONTRACTS.expenseManager}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>

            <div className="p-3 bg-[#121212]/50 rounded-xl border border-[rgba(247,231,206,0.05)]">
              <span className="text-[10px] text-stone-gray block uppercase font-bold mb-1.5">SettlementManager</span>
              <a
                href={`https://stellar.expert/explorer/testnet/contract/${CONTRACTS.settlementManager}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#B87333] hover:underline break-all flex items-center gap-1.5"
              >
                <span className="truncate">{CONTRACTS.settlementManager}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>

            <div className="p-3 bg-[#121212]/50 rounded-xl border border-[rgba(247,231,206,0.05)]">
              <span className="text-[10px] text-stone-gray block uppercase font-bold mb-1.5">Native Token (XLM SAC)</span>
              <a
                href={`https://stellar.expert/explorer/testnet/contract/${CONTRACTS.xlmToken}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#B87333] hover:underline break-all flex items-center gap-1.5"
              >
                <span className="truncate">{CONTRACTS.xlmToken}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>
          </div>
        </div>

        <div className="premium-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[rgba(247,231,206,0.08)] pb-2.5">
            <Globe className="w-4 h-4 text-[#B87333]" />
            <h3 className="text-xs font-bold font-mono text-stone-gray uppercase tracking-wider">
              Network & Node Connection
            </h3>
          </div>
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 bg-[#121212]/50 rounded-xl border border-[rgba(247,231,206,0.05)]">
              <span className="text-[10px] text-stone-gray block uppercase font-bold mb-1">RPC Endpoint</span>
              <span className="text-[#F7E7CE] select-all break-all">{RPC_URL}</span>
            </div>

            <div className="p-3 bg-[#121212]/50 rounded-xl border border-[rgba(247,231,206,0.05)]">
              <span className="text-[10px] text-stone-gray block uppercase font-bold mb-1">Network Passphrase</span>
              <span className="text-[#F7E7CE] select-all break-all">{NETWORK_PASSPHRASE}</span>
            </div>

            <div className="p-3 bg-[#121212]/50 rounded-xl border border-[rgba(247,231,206,0.05)] flex gap-3 items-start">
              <Compass className="w-4 h-4 text-[#B87333] shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] text-stone-gray block uppercase font-bold mb-1">Fee & Resource Strategy</span>
                <span className="text-stone-gray text-[11px] leading-relaxed">
                  Auto-simulation via RPC node; dynamically computed footprint footprints and ledger resource limits.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
