// @vitest-environment jsdom
import './setup';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
import { convertSplitsToScVal } from '../contracts/soroban';
import { WalletProvider, useWallet } from '../wallet/WalletContext';
import { FreighterAdapter } from '../wallet/FreighterAdapter';
import { AlbedoAdapter } from '../wallet/AlbedoAdapter';
import { SandboxAdapter } from '../wallet/SandboxAdapter';
import { SorobanEventIngestion } from '../events/SorobanEventIngestion';
import { WalletModal } from '../components/WalletModal';
import { TxStatusModal } from '../components/TxStatusModal';
import { Header } from '../components/Header';

// 1. Split ScVal Converter Unit Test
describe('Soroban Helper Utilities', () => {
  it('correctly converts split definitions into ScVal map vector', () => {
    const splits = [
      { member: 'GCAW5Q2KCBBR6RRVQRGHYOI7RMHC4V3TUADVHBZTEY5E3ADGCD5GW3HY', value: 5000 }
    ];
    const scVal = convertSplitsToScVal(splits);
    expect(scVal).toBeDefined();
    expect(scVal.switch().name).toBe('scvVec');
  });
});

// 2. Wallet Adapters Unit Tests
describe('Wallet Adapters', () => {
  it('SandboxAdapter returns dummy testnet address and rejects signing', async () => {
    const sandbox = new SandboxAdapter();
    const isAvail = await sandbox.isAvailable();
    expect(isAvail).toBe(true);

    const conn = await sandbox.connect();
    expect(conn.address).toBe('GCAW5Q2KCBBR6RRVQRGHYOI7RMHC4V3TUADVHBZTEY5E3ADGCD5GW3HY');
    expect(conn.network).toBe('TESTNET');

    await expect(sandbox.signTransaction('dummy_xdr')).rejects.toThrow(
      'Sandbox mode is read-only'
    );
  });

  it('FreighterAdapter returns availability boolean', async () => {
    const freighter = new FreighterAdapter();
    const isAvail = await freighter.isAvailable();
    expect(typeof isAvail).toBe('boolean');
  });

  it('AlbedoAdapter provides web-based intent fallback', async () => {
    const albedo = new AlbedoAdapter();
    const isAvail = await albedo.isAvailable();
    expect(isAvail).toBe(true);
  });
});

// 3. Event Ingestion Unit Test
describe('Soroban Event Ingestion', () => {
  it('instantiates event ingestion service cleanly', () => {
    const service = new SorobanEventIngestion();
    expect(service).toBeDefined();
  });
});

// 4. Wallet Modal Component Test
describe('WalletModal Component', () => {
  it('renders modal options when open', () => {
    render(
      <WalletProvider>
        <WalletModal isOpen={true} onClose={() => {}} />
      </WalletProvider>
    );

    expect(screen.getByText('Connect Stellar Wallet')).toBeInTheDocument();
    expect(screen.getByText('Freighter Browser Extension')).toBeInTheDocument();
    expect(screen.getByText('Albedo Web Wallet')).toBeInTheDocument();
    expect(screen.getByText('Read-Only Sandbox Mode')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <WalletProvider>
        <WalletModal isOpen={false} onClose={() => {}} />
      </WalletProvider>
    );

    expect(screen.queryByText('Connect Stellar Wallet')).not.toBeInTheDocument();
  });
});

// 5. TxStatusModal Component Test
describe('TxStatusModal Component', () => {
  it('renders progress step modal correctly', () => {
    const progress = {
      isProcessing: true,
      step: 'Signing' as const,
      message: 'Prompting wallet signature approval...',
    };

    render(<TxStatusModal progress={progress} onClose={() => {}} />);

    expect(screen.getByText('Step: Signing')).toBeInTheDocument();
    expect(screen.getByText('Prompting wallet signature approval...')).toBeInTheDocument();
  });

  it('renders success status modal with transaction hash', () => {
    const progress = {
      isProcessing: false,
      step: 'Success' as const,
      message: 'Transaction successfully confirmed!',
      txHash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    };

    render(<TxStatusModal progress={progress} onClose={() => {}} />);

    expect(screen.getByText('Transaction Confirmed')).toBeInTheDocument();
    expect(screen.getByText(/abcdef12/)).toBeInTheDocument();
  });
});

// 6. Header Navigation Component Test
describe('Header Navigation', () => {
  it('renders SplitPay logo and navigation tabs', () => {
    render(
      <WalletProvider>
        <Header onOpenWalletModal={() => {}} activeTab="dashboard" setActiveTab={() => {}} />
      </WalletProvider>
    );

    expect(screen.getByText('SPLITPAY')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Groups')).toBeInTheDocument();
    expect(screen.getByText('Stellar Hub')).toBeInTheDocument();
    expect(screen.getByText('Activity')).toBeInTheDocument();
  });
});

// 7. Wallet Context Test Component
const TestWalletComponent = () => {
  const wallet = useWallet();
  return (
    <div>
      <span data-testid="wallet-status">{wallet.isConnected ? 'connected' : 'disconnected'}</span>
      <span data-testid="wallet-type">{wallet.walletType}</span>
      <button onClick={() => wallet.connectWallet('sandbox')}>Connect Sandbox</button>
    </div>
  );
};

describe('Wallet Context Integration', () => {
  it('switches to sandbox wallet mode when requested', async () => {
    render(
      <WalletProvider>
        <TestWalletComponent />
      </WalletProvider>
    );

    expect(screen.getByTestId('wallet-status')).toHaveTextContent('disconnected');

    const btn = screen.getByText('Connect Sandbox');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByTestId('wallet-type')).toHaveTextContent('sandbox');
    });
  });
});
