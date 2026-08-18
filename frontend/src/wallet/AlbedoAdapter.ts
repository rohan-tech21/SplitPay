import type { WalletAdapter } from "./types";
import { NETWORK_PASSPHRASE } from "../contracts/config";

export class AlbedoAdapter implements WalletAdapter {
  name = "Albedo Wallet";
  type = "albedo" as const;

  async isAvailable(): Promise<boolean> {
    // Albedo is web-based via albedo.link popup, so always available
    return true;
  }

  async connect(): Promise<{ address: string; network?: string }> {
    try {
      // Dynamic import of albedo intent if installed, or web intent
      const albedo = await import("@albedo-link/intent").catch(() => null);
      if (albedo && albedo.default) {
        const res = await albedo.default.publicKey({});
        return { address: res.pubkey, network: "TESTNET" };
      }
      // Fallback web window redirect/popup fallback
      throw new Error("Albedo link SDK not loaded.");
    } catch (err: any) {
      throw new Error(`Albedo connection failed: ${err?.message || err}`);
    }
  }

  async disconnect(): Promise<void> {
    // Web session disconnect
  }

  async signTransaction(xdr: string, opts?: { networkPassphrase?: string }): Promise<string> {
    try {
      const albedo = await import("@albedo-link/intent").catch(() => null);
      if (albedo && albedo.default) {
        const res = await albedo.default.tx({
          xdr,
          network: opts?.networkPassphrase || NETWORK_PASSPHRASE,
        });
        return res.signed_envelope_xdr;
      }
      throw new Error("Albedo link SDK not loaded.");
    } catch (err: any) {
      throw new Error(`Albedo signing failed: ${err?.message || err}`);
    }
  }
}
