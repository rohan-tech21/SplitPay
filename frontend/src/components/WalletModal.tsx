import React from "react";
import { X, Wallet, ShieldCheck, ExternalLink, AlertTriangle, RefreshCw } from "lucide-react";
import { useWallet } from "../wallet/WalletContext";
import type { WalletType } from "../wallet/types";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const wallet = useWallet();

  if (!isOpen) return null;

  const handleSelectWallet = async (type: WalletType) => {
    try {
      await wallet.connectWallet(type);
      onClose();
    } catch (err) {
      // Error managed in wallet context
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md fade-in">
      <div className="premium-card rounded-2xl max-w-md w-full p-6 space-y-6 border border-[rgba(184,115,51,0.3)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgba(247,231,206,0.08)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#B87333]/15 flex items-center justify-center text-[#B87333] border border-[rgba(184,115,51,0.25)]">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#F7E7CE]">Connect Stellar Wallet</h3>
              <p className="text-xs text-stone-gray">Select your active web3 wallet provider</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-stone-gray hover:text-[#F7E7CE] hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {wallet.error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex gap-2.5 items-start">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{wallet.error}</span>
          </div>
        )}

        {/* Network Mismatch Warning */}
        {wallet.isWrongNetwork && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex gap-2.5 items-start">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Your wallet is connected to non-Testnet network ({wallet.network}). Please switch Freighter to Stellar Testnet.</span>
          </div>
        )}

        {/* Wallet Options */}
        <div className="space-y-3">
          {/* Freighter */}
          <button
            onClick={() => handleSelectWallet("freighter")}
            disabled={wallet.isLoading}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-[#121212] border border-[rgba(184,115,51,0.2)] hover:border-[#B87333] hover:bg-[#B87333]/5 text-left transition group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#B87333]/20 flex items-center justify-center text-[#B87333]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-[#F7E7CE] block group-hover:text-[#B87333] transition">
                  Freighter Browser Extension
                </span>
                <span className="text-[11px] text-stone-gray">Recommended for Stellar & Soroban</span>
              </div>
            </div>
            {wallet.walletType === "freighter" && wallet.isConnected && (
              <span className="text-[10px] font-mono uppercase bg-[#355E3B]/20 text-[#A4D2A6] px-2 py-1 rounded-md font-bold">
                Connected
              </span>
            )}
          </button>

          {/* Albedo */}
          <button
            onClick={() => handleSelectWallet("albedo")}
            disabled={wallet.isLoading}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-[#121212] border border-[rgba(247,231,206,0.1)] hover:border-[rgba(247,231,206,0.3)] hover:bg-white/5 text-left transition group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-400">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-[#F7E7CE] block group-hover:text-sky-400 transition">
                  Albedo Web Wallet
                </span>
                <span className="text-[11px] text-stone-gray">No extension required (Web Intent)</span>
              </div>
            </div>
            {wallet.walletType === "albedo" && wallet.isConnected && (
              <span className="text-[10px] font-mono uppercase bg-[#355E3B]/20 text-[#A4D2A6] px-2 py-1 rounded-md font-bold">
                Connected
              </span>
            )}
          </button>

          {/* Sandbox Fallback */}
          <button
            onClick={() => handleSelectWallet("sandbox")}
            disabled={wallet.isLoading}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-[#121212]/50 border border-[rgba(247,231,206,0.05)] hover:border-[rgba(247,231,206,0.2)] text-left transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-stone-500/20 flex items-center justify-center text-stone-400">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-medium text-stone-gray block">
                  Read-Only Sandbox Mode
                </span>
                <span className="text-[11px] text-stone-gray/70">Inspect active groups without wallet</span>
              </div>
            </div>
          </button>
        </div>

        {/* Installation Link */}
        <div className="pt-2 text-center text-xs text-stone-gray border-t border-[rgba(247,231,206,0.08)] flex items-center justify-center gap-1">
          <span>Need Freighter?</span>
          <a
            href="https://www.freighter.app/"
            target="_blank"
            rel="noreferrer"
            className="text-[#B87333] hover:underline flex items-center gap-0.5 font-bold"
          >
            Install Extension <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
