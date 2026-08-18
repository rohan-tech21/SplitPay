import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { WalletType, WalletState, WalletAdapter } from "./types";
import { FreighterAdapter } from "./FreighterAdapter";
import { AlbedoAdapter } from "./AlbedoAdapter";
import { SandboxAdapter } from "./SandboxAdapter";
import { Horizon } from "@stellar/stellar-sdk";
import { RPC_URL } from "../contracts/config";

interface WalletContextType extends WalletState {
  connectWallet: (type: WalletType) => Promise<void>;
  disconnectWallet: () => Promise<void>;
  refreshBalance: () => Promise<number>;
  signTransaction: (xdr: string) => Promise<string>;
  activeAdapter: WalletAdapter | null;
}

const WalletContext = createContext<WalletContextType | null>(null);

const freighterAdapter = new FreighterAdapter();
const albedoAdapter = new AlbedoAdapter();
const sandboxAdapter = new SandboxAdapter();

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    walletType: "sandbox",
    network: null,
    isWrongNetwork: false,
    balance: 0,
    isLoading: false,
    error: null,
  });

  const [activeAdapter, setActiveAdapter] = useState<WalletAdapter | null>(null);

  const fetchBalance = useCallback(async (addr: string): Promise<number> => {
    try {
      const horizonUrl = RPC_URL.includes("testnet")
        ? "https://horizon-testnet.stellar.org"
        : "https://horizon.stellar.org";
      const horizon = new Horizon.Server(horizonUrl);
      const acc = await horizon.loadAccount(addr);
      const nativeBal = acc.balances.find((b) => b.asset_type === "native");
      return nativeBal ? parseFloat(nativeBal.balance) : 0;
    } catch (err: any) {
      // Unfunded account on Testnet returns 404
      if (err?.response?.status === 404) {
        return 0.0;
      }
      return 0.0;
    }
  }, []);

  const refreshBalance = useCallback(async (): Promise<number> => {
    if (!state.address) return 0;
    const bal = await fetchBalance(state.address);
    setState((prev) => ({ ...prev, balance: bal }));
    return bal;
  }, [state.address, fetchBalance]);

  const connectWallet = useCallback(async (type: WalletType) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      let adapter: WalletAdapter;
      if (type === "freighter") {
        adapter = freighterAdapter;
      } else if (type === "albedo") {
        adapter = albedoAdapter;
      } else {
        adapter = sandboxAdapter;
      }

      const { address, network } = await adapter.connect();
      const bal = await fetchBalance(address);
      const isWrong = network ? !network.toUpperCase().includes("TESTNET") : false;

      setActiveAdapter(adapter);
      setState({
        address,
        isConnected: type !== "sandbox",
        walletType: type,
        network: network || "TESTNET",
        isWrongNetwork: isWrong,
        balance: bal,
        isLoading: false,
        error: null,
      });

      localStorage.setItem("splitpay_preferred_wallet", type);
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err?.message || "Failed to connect wallet",
      }));
      throw err;
    }
  }, [fetchBalance]);

  const disconnectWallet = useCallback(async () => {
    if (activeAdapter) {
      await activeAdapter.disconnect();
    }
    setActiveAdapter(null);
    setState({
      address: null,
      isConnected: false,
      walletType: "sandbox",
      network: null,
      isWrongNetwork: false,
      balance: 0,
      isLoading: false,
      error: null,
    });
    localStorage.removeItem("splitpay_preferred_wallet");
  }, [activeAdapter]);

  const signTransaction = useCallback(async (xdr: string): Promise<string> => {
    if (!activeAdapter) {
      throw new Error("No wallet connected to sign transaction.");
    }
    return activeAdapter.signTransaction(xdr);
  }, [activeAdapter]);

  // Auto-connect on mount if previous wallet saved
  useEffect(() => {
    const saved = localStorage.getItem("splitpay_preferred_wallet") as WalletType | null;
    if (saved && saved !== "sandbox") {
      connectWallet(saved).catch(() => {
        // Fallback to sandbox silently if saved wallet is not available
      });
    }
  }, [connectWallet]);

  return (
    <WalletContext.Provider
      value={{
        ...state,
        connectWallet,
        disconnectWallet,
        refreshBalance,
        signTransaction,
        activeAdapter,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
