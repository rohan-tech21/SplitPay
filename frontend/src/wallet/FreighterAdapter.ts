import { isConnected, isAllowed, setAllowed, getAddress, getNetwork, signTransaction } from "@stellar/freighter-api";
import type { WalletAdapter } from "./types";
import { NETWORK_PASSPHRASE } from "../contracts/config";

export class FreighterAdapter implements WalletAdapter {
  name = "Freighter Wallet";
  type = "freighter" as const;

  async isAvailable(): Promise<boolean> {
    try {
      const res = await isConnected();
      return !!res.isConnected;
    } catch {
      return false;
    }
  }

  async connect(): Promise<{ address: string; network?: string }> {
    const available = await this.isAvailable();
    if (!available) {
      throw new Error("Freighter wallet extension is not installed in your browser.");
    }

    const allowedRes = await isAllowed();
    if (!allowedRes.isAllowed) {
      const setRes = await setAllowed();
      if (!setRes.isAllowed) {
        throw new Error("Freighter connection request was rejected by user.");
      }
    }

    const addrRes = await getAddress();
    if (addrRes.error || !addrRes.address) {
      throw new Error(addrRes.error || "Failed to retrieve public key from Freighter.");
    }

    let networkName: string | undefined;
    try {
      const netRes = await getNetwork();
      networkName = netRes.network;
    } catch {
      // Ignore if network call fails
    }

    return {
      address: addrRes.address,
      network: networkName,
    };
  }

  async disconnect(): Promise<void> {
    // Freighter doesn't have an explicit programmatic disconnect, reset local state
  }

  async signTransaction(xdr: string, opts?: { networkPassphrase?: string }): Promise<string> {
    const { signedTxXdr, error } = await signTransaction(xdr, {
      networkPassphrase: opts?.networkPassphrase || NETWORK_PASSPHRASE,
    });

    if (error) {
      throw new Error(`Freighter signature error: ${error}`);
    }

    if (!signedTxXdr) {
      throw new Error("User declined or Freighter returned empty signature.");
    }

    return signedTxXdr;
  }
}
