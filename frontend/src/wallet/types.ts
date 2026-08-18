export type WalletType = 'freighter' | 'albedo' | 'sandbox';

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  walletType: WalletType;
  network: string | null;
  isWrongNetwork: boolean;
  balance: number;
  isLoading: boolean;
  error: string | null;
}

export interface WalletAdapter {
  name: string;
  type: WalletType;
  isAvailable(): Promise<boolean>;
  connect(): Promise<{ address: string; network?: string }>;
  disconnect(): Promise<void>;
  signTransaction(xdr: string, opts?: { networkPassphrase?: string }): Promise<string>;
}
