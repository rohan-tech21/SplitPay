import { 
  Operation, 
  TransactionBuilder, 
  scValToNative, 
  Transaction,
  rpc,
  Account,
  xdr,
  Address,
  nativeToScVal
} from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";
import { RPC_URL, NETWORK_PASSPHRASE } from "./config";

const server = new Server(RPC_URL);

// Dummy key used to run simulate/read-only calls when no user is logged in
export const DUMMY_PUBLIC_KEY = "GCAW5Q2KCBBR6RRVQRGHYOI7RMHC4V3TUADVHBZTEY5E3ADGCD5GW3HY";

export type TxStep = 'Preparing' | 'Signing' | 'Submitting' | 'Confirming' | 'Success' | 'Failed';

export interface TxStatusCallback {
  (step: TxStep, message: string, hash?: string): void;
}

export async function simulateCall(contractId: string, functionName: string, args: any[]) {
  try {
    const account = new Account(DUMMY_PUBLIC_KEY, "0");
    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: NETWORK_PASSPHRASE
    })
    .addOperation(Operation.invokeContractFunction({
      contract: contractId,
      function: functionName,
      args
    }))
    .setTimeout(30)
    .build();

    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(sim) && sim.result) {
      return scValToNative(sim.result.retval);
    }
    if (rpc.Api.isSimulationError(sim)) {
      console.warn(`Simulation returned error for ${functionName}:`, sim.error);
    }
    return null;
  } catch (err: any) {
    console.error(`Simulation failed for ${functionName}:`, err);
    throw err;
  }
}

export async function submitTransaction(
  userPublicKey: string, 
  contractId: string, 
  functionName: string, 
  args: any[],
  signerFn: (xdrStr: string) => Promise<string>,
  onStatusChange?: TxStatusCallback
): Promise<string> {
  try {
    onStatusChange?.('Preparing', 'Fetching account sequence & building transaction footprint...');

    let account: Account;
    try {
      account = await server.getAccount(userPublicKey);
    } catch (accErr: any) {
      if (accErr?.response?.status === 404 || accErr?.status === 404) {
        throw new Error("Your Stellar Testnet account is unfunded or not found. Please fund your account using Friendbot.");
      }
      account = new Account(userPublicKey, "0");
    }

    // 1. Build the base transaction
    let tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: NETWORK_PASSPHRASE
    })
    .addOperation(Operation.invokeContractFunction({
      contract: contractId,
      function: functionName,
      args
    }))
    .setTimeout(60)
    .build();

    // 2. Prepare transaction (simulate to fetch footprint and fees)
    try {
      tx = await server.prepareTransaction(tx);
    } catch (prepErr: any) {
      throw new Error(`Transaction simulation failed: ${prepErr?.message || prepErr}`);
    }

    // 3. Request user signature via Wallet
    onStatusChange?.('Signing', 'Prompting wallet signature approval...');
    const xdrStr = tx.toXDR();
    const signedTxXdr = await signerFn(xdrStr);

    if (!signedTxXdr) {
      throw new Error("Wallet returned empty signature.");
    }

    // 4. Send transaction to the Soroban RPC server
    onStatusChange?.('Submitting', 'Submitting signed envelope to Stellar RPC node...');
    const signedTx = new Transaction(signedTxXdr, NETWORK_PASSPHRASE);
    const sendRes = await server.sendTransaction(signedTx);
    
    if (sendRes.status === "ERROR") {
      throw new Error(`RPC error on submission: ${JSON.stringify((sendRes as any).errorResultXdr || (sendRes as any).errorResult || sendRes.status)}`);
    }

    const hash = sendRes.hash;
    onStatusChange?.('Confirming', 'Waiting for ledger close confirmation...', hash);

    // 5. Poll for finalization (status = SUCCESS / FAILED)
    let txResult: any = null;

    for (let i = 0; i < 30; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      try {
        txResult = await server.getTransaction(hash);
        if (txResult.status === rpc.Api.GetTransactionStatus.SUCCESS) {
          break;
        } else if (txResult.status === rpc.Api.GetTransactionStatus.FAILED) {
          throw new Error(`Transaction execution failed on-chain (status FAILED).`);
        }
      } catch (pollErr: any) {
        // Continue polling if transaction is NOT_FOUND yet during ledger propagation
        if (i === 29) throw pollErr;
      }
    }

    if (!txResult || txResult.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
      throw new Error(`Transaction polling timed out after 45s.`);
    }

    onStatusChange?.('Success', 'Transaction successfully confirmed on Stellar Testnet!', hash);
    return hash;
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    onStatusChange?.('Failed', errorMsg);
    console.error(`Transaction submission error (${functionName}):`, err);
    throw err;
  }
}

// Helper to convert split definitions into Soroban ScVal SplitDetail vectors correctly
export function convertSplitsToScVal(splits: { member: string; value: number }[]): xdr.ScVal {
  return xdr.ScVal.scvVec(
    splits.map((s) => {
      return xdr.ScVal.scvMap([
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol("member"),
          val: Address.fromString(s.member).toScVal()
        }),
        new xdr.ScMapEntry({
          key: xdr.ScVal.scvSymbol("value"),
          val: nativeToScVal(BigInt(Math.round(s.value)), { type: "i128" })
        })
      ]);
    })
  );
}
