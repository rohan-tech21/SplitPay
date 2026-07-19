import React, { useState } from "react";
import { useContractsData } from "./hooks/useContractsData";
import { Header } from "./components/Header";
import { DashboardView } from "./components/DashboardView";
import { GroupsView } from "./components/GroupsView";
import { StellarHubView } from "./components/StellarHubView";
import { ActivityView } from "./components/ActivityView";

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

  return (
    <div className="min-h-screen bg-[#121212] text-on-surface font-sans antialiased selection:bg-primary/30 pb-16">
      {/* BACKGROUND EFFECTS */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#B87333]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#B87333]/3 rounded-full blur-[150px]" />
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

      {/* MAIN CONTAINER */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-28 space-y-6">
        {/* LEDGER SYNC INDICATOR & ERROR LOGS */}
        <div className="flex flex-col gap-3">
          {error && (
            <div className="p-4 bg-red-500/15 border border-red-500/25 rounded-2xl text-red-400 text-xs font-semibold flex items-center justify-between shadow-lg fade-in">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-400">error</span>
                <span>{error}</span>
              </div>
              <button onClick={() => refreshData()} className="text-[10px] uppercase font-bold tracking-wider hover:underline text-primary">
                Retry Sync
              </button>
            </div>
          )}

          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2 text-on-surface-variant font-mono">
              <span className={`w-2 h-2 rounded-full ${walletConnected ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`} />
              <span>{walletConnected ? "Freighter Connected (Testnet)" : "Freighter Disconnected"}</span>
            </div>
            <button
              onClick={() => refreshData()}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-primary hover:underline font-mono text-[10px] uppercase tracking-widest disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-xs ${refreshing ? "animate-spin" : ""}`}>
                sync
              </span>
              {refreshing ? "Syncing Ledger..." : "Sync Ledger"}
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

      {/* CREATE GROUP MODAL */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#121212]/80 backdrop-blur-sm">
          <form onSubmit={handleCreateGroupSubmit} className="glass-panel-heavy border-copper w-full max-w-md rounded-xl p-6 space-y-4 fade-in border">
            <div className="flex justify-between items-center border-b border-outline-variant/10 pb-3">
              <h2 className="font-extrabold text-sm text-on-surface">Create New Shared Group</h2>
              <button type="button" onClick={() => setShowCreateGroupModal(false)} className="text-on-surface-variant hover:text-primary">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider block mb-2">Group Name</label>
                <input
                  required
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Aurelian Reserve Trip"
                  className="input-dark w-full rounded-lg py-2.5 px-4 text-on-surface text-xs focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(false)}
                className="btn-secondary px-4 py-2 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary px-6 py-2 rounded-lg text-xs font-bold"
              >
                {loading ? "Creating..." : "Create Group"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
