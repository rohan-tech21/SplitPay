import React from "react";

interface HeaderProps {
  walletConnected: boolean;
  userAddress: string | null;
  userBalance: string;
  loading: boolean;
  onConnect: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  walletConnected,
  userAddress,
  userBalance,
  loading,
  onConnect,
  activeTab,
  setActiveTab
}) => {
  return (
    <nav className="glass-nav fixed top-0 left-0 right-0 z-40 px-6 py-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        {/* LOGO */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl copper-gradient flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-background text-2xl font-bold">account_balance_wallet</span>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wider text-primary">SPLITPAY</h1>
            <p className="text-[10px] text-on-surface-variant font-mono tracking-widest uppercase">Soroban Production Node</p>
          </div>
        </div>

        {/* TABS */}
        <div className="flex bg-surface-container/80 p-1 rounded-xl border border-outline-variant/10">
          {["dashboard", "groups", "stellar", "activity"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 capitalize ${
                activeTab === tab
                  ? "copper-bg text-background shadow-md font-extrabold"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {tab === "stellar" ? "Stellar Hub" : tab}
            </button>
          ))}
        </div>

        {/* WALLET BUTTON */}
        <div className="flex items-center gap-4">
          {walletConnected && userAddress && (
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-[10px] text-on-surface-variant font-mono uppercase">Connected Address</span>
              <span className="text-xs font-bold text-primary font-mono">
                {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
              </span>
            </div>
          )}

          {walletConnected && (
            <div className="hidden sm:flex bg-[#1E1E1E] border border-outline-variant/10 px-3 py-1.5 rounded-lg items-center gap-2">
              <span className="material-symbols-outlined text-primary text-sm">payments</span>
              <span className="text-xs font-bold text-on-surface">{userBalance} XLM</span>
            </div>
          )}

          <button
            disabled={loading}
            onClick={onConnect}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all duration-300 ${
              walletConnected
                ? "bg-[#1C3A27] text-[#A3E635] border border-[#22C55E]/20"
                : "copper-button"
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {walletConnected ? "check_circle" : "account_balance_wallet"}
            </span>
            {walletConnected ? "Wallet Connected" : "Connect Freighter"}
          </button>
        </div>
      </div>
    </nav>
  );
};
