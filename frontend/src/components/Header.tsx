import React, { useState } from "react";
import { Wallet, Menu, X, Landmark, Globe, LogOut } from "lucide-react";
import { useWallet } from "../wallet/WalletContext";

interface HeaderProps {
  onOpenWalletModal: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenWalletModal,
  activeTab,
  setActiveTab
}) => {
  const wallet = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "groups", label: "Groups" },
    { id: "stellar", label: "Stellar Hub" },
    { id: "activity", label: "Activity" }
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#121212]/95 backdrop-blur-md border-b border-[rgba(184,115,51,0.15)] premium-shadow px-4 py-3 sm:px-6">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        {/* LOGO */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#B87333] to-[#8c4f10] flex items-center justify-center shadow-lg border border-[rgba(247,231,206,0.15)]">
            <Landmark className="w-5 h-5 text-[#121212] stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-wider text-[#B87333] font-logo">SPLITPAY</h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#355E3B]/20 border border-[#355E3B]/40 text-[9px] font-mono text-[#A4D2A6]">
                <Globe className="w-2.5 h-2.5" />
                Testnet
              </span>
            </div>
            <p className="text-[9px] text-stone-gray font-mono tracking-widest uppercase">Soroban Decentralized Ledger</p>
          </div>
        </div>

        {/* DESKTOP TABS */}
        <div className="hidden md:flex bg-[#1A1A1A] p-1 rounded-xl border border-[rgba(247,231,206,0.08)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setMobileMenuOpen(false);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                activeTab === tab.id
                  ? "btn-primary shadow-sm"
                  : "text-stone-gray hover:text-[#B87333]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* DESKTOP & TABLET WALLET PANEL */}
        <div className="hidden sm:flex items-center gap-3">
          {wallet.isConnected && wallet.address ? (
            <>
              <div className="flex bg-[#1A1A1A] border border-[rgba(247,231,206,0.1)] px-3 py-1.5 rounded-xl items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-[#F7E7CE] font-mono">
                  {wallet.balance.toFixed(2)} XLM
                </span>
              </div>

              <div className="flex items-center bg-[#1A1A1A] border border-[rgba(184,115,51,0.25)] rounded-xl p-1">
                <button
                  onClick={onOpenWalletModal}
                  className="px-3 py-1 text-xs font-bold text-[#B87333] font-mono hover:text-[#F7E7CE] transition"
                  title="Switch Wallet"
                >
                  {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                </button>
                <button
                  onClick={() => wallet.disconnectWallet()}
                  className="p-1.5 text-stone-gray hover:text-rose-400 transition hover:bg-rose-500/10 rounded-lg"
                  title="Disconnect Wallet"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={onOpenWalletModal}
              className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black tracking-wide uppercase cursor-pointer transition-all duration-300"
            >
              <Wallet className="w-4 h-4" />
              <span>Connect Wallet</span>
            </button>
          )}
        </div>

        {/* MOBILE CONTROLS & HAMBURGER */}
        <div className="flex items-center gap-2 sm:hidden">
          {!wallet.isConnected ? (
            <button
              onClick={onOpenWalletModal}
              className="p-2 rounded-lg bg-[#B87333]/15 border border-[rgba(184,115,51,0.35)] text-[#B87333] hover:bg-[#B87333]/25 transition-colors cursor-pointer"
              title="Connect Wallet"
            >
              <Wallet className="w-4 h-4" />
            </button>
          ) : (
            <div className="bg-[#1A1A1A] border border-[rgba(247,231,206,0.08)] px-2.5 py-1.5 rounded-lg text-xs font-bold text-[#F7E7CE] font-mono">
              {wallet.balance.toFixed(1)} XLM
            </div>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-[#1A1A1A] border border-[rgba(247,231,206,0.08)] text-[#F7E7CE] hover:text-[#B87333] transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER / OVERLAY */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-[65px] left-0 right-0 bg-[#121212]/95 backdrop-blur-md border-b border-[rgba(184,115,51,0.15)] px-4 py-6 space-y-4 fade-in">
          <div className="flex flex-col gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold transition-all duration-150 ${
                  activeTab === tab.id
                    ? "bg-[#B87333]/10 text-[#B87333] border-l-2 border-[#B87333]"
                    : "text-[#F7E7CE]/80 hover:bg-[#1A1A1A] hover:text-[#B87333]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-[rgba(247,231,206,0.08)] flex flex-col gap-3">
            {wallet.isConnected && wallet.address && (
              <div className="flex justify-between items-center px-2">
                <span className="text-xs text-stone-gray font-mono">Wallet</span>
                <span className="text-xs font-bold text-[#B87333] font-mono">
                  {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                </span>
              </div>
            )}

            {!wallet.isConnected ? (
              <button
                onClick={() => {
                  onOpenWalletModal();
                  setMobileMenuOpen(false);
                }}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black tracking-wide uppercase cursor-pointer"
              >
                <Wallet className="w-4 h-4" />
                <span>Connect Wallet</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  wallet.disconnectWallet();
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnect</span>
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
