import type { WalletAdapter } from "./types";

export class SandboxAdapter implements WalletAdapter {
  name = "Soroban Sandbox Mode";
  type = "sandbox" as const;
  private dummyAddress = "GCAW5Q2KCBBR6RRVQRGHYOI7RMHC4V3TUADVHBZTEY5E3ADGCD5GW3HY";

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async connect(): Promise<{ address: string; network?: string }> {
    return {
      address: this.dummyAddress,
      network: "TESTNET",
    };
  }

  async disconnect(): Promise<void> {}

  async signTransaction(_xdr?: string): Promise<string> {
    throw new Error("Sandbox mode is read-only. Please connect a valid wallet (Freighter) to sign transactions.");
  }
}
