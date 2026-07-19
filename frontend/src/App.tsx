import React, { useState } from "react";
import { useContractsData } from "./hooks/useContractsData";
import { Header } from "./components/Header";
import { DashboardView } from "./components/DashboardView";
import { GroupsView } from "./components/GroupsView";
import { StellarHubView } from "./components/StellarHubView";
import { ActivityView } from "./components/ActivityView";
import { 
  Zap, 
  ShieldAlert, 
  RefreshCw, 
  Wallet, 
  Cpu, 
  TrendingUp, 
  Lock, 
  ChevronRight, 
  Globe, 
  X, 
  Plus 
} from "lucide-react";

export default function App() {
  const {
    walletConnected,
    userAddress,
    userBalance,
    loading,
    refreshing,
    groups,
    activityLogs,
    error,
    checkWallet,
    createGroup,
    joinGroup,
    leaveGroup,
    addExpense,
    deleteExpense,
    settleDebtManual,
    settleDebtToken,
    addMember,
    refreshData
  } = useContractsData();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [demoMode, setDemoMode] = useState(false);

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      await createGroup(newGroupName.trim());
      setShowCreateGroupModal(false);
      setNewGroupName("");
      setActiveTab("groups");
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleWalletConnect = () => {
    checkWallet();
  };

  const showWorkspace = walletConnected || demoMode;

  return (
    <div className="min-h-screen bg-[#121212] text-[#F7E7CE] font-sans antialiased selection:bg-[#B87333]/30 pb-16 relative">
      {/* BACKGROUND GLOWS */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[50%] bg-[#B87333]/4 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[50%] bg-[#B87333]/3 rounded-full blur-[160px]" />
      </div>

      {/* NAVBAR */}
      <Header
        walletConnected={walletConnected}
        userAddress={userAddress}
        userBalance={userBalance}
        loading={loading}
        onConnect={handleWalletConnect}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {showWorkspace ? (
        /* WORKSPACE INTERFACE */
        <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-24 space-y-6">
          {/* LEDGER SYNC INDICATOR & ERROR LOGS */}
          <div className="flex flex-col gap-3">
            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-rose-400 text-xs font-semibold flex items-center justify-between shadow-lg fade-in">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
                <button 
                  onClick={() => refreshData()} 
                  className="text-[10px] uppercase font-bold tracking-wider hover:underline text-[#B87333] cursor-pointer"
                >
                  Retry Sync
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center text-xs">
              <div className="flex items-center gap-2 text-stone-gray font-mono">
                <span className={`w-2 h-2 rounded-full ${walletConnected ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`} />
                <span>
                  {walletConnected ? "Freighter Connected (Testnet)" : "Demo Mode (Read-Only Ledger)"}
                </span>
              </div>
              <button
                onClick={() => refreshData()}
                disabled={refreshing}
                className="flex items-center gap-1.5 text-[#B87333] hover:underline font-mono text-[9px] uppercase tracking-widest disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Syncing..." : "Sync Ledger"}
              </button>
            </div>
          </div>

          {/* TAB VIEWS */}
          {activeTab === "dashboard" && (
            <DashboardView
              userAddress={userAddress}
              groups={groups}
              activityLogs={activityLogs}
              setActiveTab={setActiveTab}
              setShowCreateGroupModal={setShowCreateGroupModal}
            />
          )}

          {activeTab === "groups" && (
            <GroupsView
              userAddress={userAddress}
              groups={groups}
              loading={loading}
              onJoinGroup={joinGroup}
              onLeaveGroup={leaveGroup}
              onAddMember={addMember}
              onAddExpense={addExpense}
              onDeleteExpense={deleteExpense}
              onSettleDebtManual={settleDebtManual}
              onSettleDebtToken={settleDebtToken}
            />
          )}

          {activeTab === "stellar" && <StellarHubView />}

          {activeTab === "activity" && <ActivityView activityLogs={activityLogs} />}
        </main>
      ) : (
        /* PREMIUM LANDING PAGE */
        <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-32 pb-12 flex flex-col items-center justify-center space-y-16">
          {/* HERO SECTION */}
          <div className="text-center space-y-6 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#B87333]/10 border border-[rgba(184,115,51,0.2)] text-[#B87333] text-[10px] font-bold uppercase tracking-wider font-mono">
              <Zap className="w-3.5 h-3.5" />
              <span>Stellar Soroban Network Smart Contracts</span>
            </div>
            
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-[#F7E7CE] tracking-tight leading-tight">
              Decentralized Expense Splitting for High-Trust Teams
            </h1>
            
            <p className="text-sm sm:text-base text-stone-gray max-w-2xl mx-auto leading-relaxed">
              Ditch centralized payment databases. Audit shared balances, net outstanding debts, and settle natively in XLM using secure smart contracts.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <button
                onClick={handleWalletConnect}
                className="btn-primary w-full sm:w-auto px-8 py-3.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                <Wallet className="w-4 h-4" />
                <span>Connect Freighter Wallet</span>
              </button>
              
              <button
                onClick={() => setDemoMode(true)}
                className="btn-secondary w-full sm:w-auto px-8 py-3.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Enter Read-Only Demo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* KEY METRICS / STATISTICS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl pt-4">
            <div className="premium-card p-5 rounded-2xl text-center space-y-1">
              <span className="text-[10px] text-stone-gray font-mono uppercase tracking-wider">Node Latency</span>
              <p className="text-lg sm:text-2xl font-black text-[#B87333]">~1.2s</p>
            </div>
            <div className="premium-card p-5 rounded-2xl text-center space-y-1">
              <span className="text-[10px] text-stone-gray font-mono uppercase tracking-wider">Gas Cost</span>
              <p className="text-lg sm:text-2xl font-black text-[#B87333]">&lt; 0.0001 XLM</p>
            </div>
            <div className="premium-card p-5 rounded-2xl text-center space-y-1">
              <span className="text-[10px] text-stone-gray font-mono uppercase tracking-wider">Ledger Uptime</span>
              <p className="text-lg sm:text-2xl font-black text-[#B87333]">100%</p>
            </div>
            <div className="premium-card p-5 rounded-2xl text-center space-y-1">
              <span className="text-[10px] text-stone-gray font-mono uppercase tracking-wider">Validation Time</span>
              <p className="text-lg sm:text-2xl font-black text-[#B87333]">&lt; 30s</p>
            </div>
          </div>

          {/* FEATURE GRID */}
          <div className="space-y-6 w-full max-w-5xl">
            <div className="text-center space-y-1">
              <h2 className="text-lg sm:text-xl font-bold text-[#F7E7CE]">Engineered for Cryptographic Trust</h2>
              <p className="text-xs text-stone-gray">No intermediaries. Real-time verification.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* FEATURE 1 */}
              <div className="premium-card p-6 rounded-2xl space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#B87333]/15 flex items-center justify-center text-[#B87333] border border-[rgba(184,115,51,0.2)]">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-[#F7E7CE]">Soroban Contracts</h3>
                <p className="text-xs text-stone-gray leading-relaxed">
                  WebAssembly smart contracts execute settlements dynamically and deterministic. Fully open-source and auditable on-chain.
                </p>
              </div>

              {/* FEATURE 2 */}
              <div className="premium-card p-6 rounded-2xl space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#B87333]/15 flex items-center justify-center text-[#B87333] border border-[rgba(184,115,51,0.2)]">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-[#F7E7CE]">Algorithmic Netting</h3>
                <p className="text-xs text-stone-gray leading-relaxed">
                  Automatically calculates debt vectors within groups to minimize transaction count. Settle everything in a single signature.
                </p>
              </div>

              {/* FEATURE 3 */}
              <div className="premium-card p-6 rounded-2xl space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#B87333]/15 flex items-center justify-center text-[#B87333] border border-[rgba(184,115,51,0.2)]">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-[#F7E7CE]">Freighter Signatures</h3>
                <p className="text-xs text-stone-gray leading-relaxed">
                  Your keys never leave your device. Sign state transitions directly using your preferred Freighter browser extension.
                </p>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <footer className="w-full border-t border-[rgba(247,231,206,0.05)] pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-stone-gray font-mono max-w-5xl">
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#B87333]" />
              <span>Stellar Level 4 Production-Grade Release</span>
            </div>
            <span>© {new Date().getFullYear()} SplitPay. All rights reserved.</span>
          </footer>
        </main>
      )}

      {/* CREATE GROUP MODAL */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121212]/85 backdrop-blur-md">
          <form onSubmit={handleCreateGroupSubmit} className="premium-card w-full max-w-md rounded-2xl p-6 space-y-5 fade-in">
            <div className="flex justify-between items-center border-b border-[rgba(247,231,206,0.08)] pb-3">
              <h2 className="font-bold text-sm text-[#F7E7CE]">Create New Shared Group</h2>
              <button 
                type="button" 
                onClick={() => setShowCreateGroupModal(false)} 
                className="text-stone-gray hover:text-[#B87333] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] text-stone-gray font-mono uppercase tracking-wider block">Group Name</label>
                <input
                  required
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Aurelia Trip"
                  className="input-premium w-full rounded-xl py-3 px-4 text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(false)}
                className="btn-secondary px-4 py-2 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary px-5 py-2 rounded-xl text-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{loading ? "Creating..." : "Create Group"}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
