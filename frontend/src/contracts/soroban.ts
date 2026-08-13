import { 
  Operation, 
  TransactionBuilder, 
  scValToNative, 
  Transaction,
  rpc
} from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";
import { signTransaction } from "@stellar/freighter-api";
import { RPC_URL, NETWORK_PASSPHRASE } from "./config";

const server = new Server(RPC_URL);

// Dummy key used to run simulate/read-only calls when no user is logged in
const DUMMY_PUBLIC_KEY = "GDB5M653ZNGF4Z4NKBV56T77J4G3K6P2CZXHOCPCO6PCD6PCD6PCD6PC";

export async function simulateCall(contractId: string, functionName: string, args: any[]) {
  try {
    const account = await server.getAccount(DUMMY_PUBLIC_KEY);
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
    throw new Error(`Simulation returned no result for ${functionName}`);
  } catch (err: any) {
    console.error(`Simulation failed for ${functionName}:`, err);
    throw err;
  }
}

export async function submitTransaction(
  userPublicKey: string, 
  contractId: string, 
  functionName: string, 
  args: any[]
): Promise<string> {
  try {
    const account = await server.getAccount(userPublicKey);
    
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
    .setTimeout(30)
    .build();

    // 2. Prepare transaction (simulate to fetch footprint and fees)
    tx = await server.prepareTransaction(tx);

    // 3. Request user signature via Freighter
    const xdrStr = tx.toXDR();
    const { signedTxXdr, error } = await signTransaction(xdrStr, {
      networkPassphrase: NETWORK_PASSPHRASE
    });

    if (error) {
      throw new Error(`Freighter signature rejected: ${error}`);
    }

    if (!signedTxXdr) {
      throw new Error("Freighter returned empty signature");
    }

    // 4. Send transaction to the Soroban RPC server
    const signedTx = new Transaction(signedTxXdr, NETWORK_PASSPHRASE);
    const sendRes = await server.sendTransaction(signedTx);
    if (sendRes.status === "ERROR") {
      throw new Error(`RPC returned transaction error: ${sendRes.status}`);
    }

    // 5. Poll for finalization (status = SUCCESS / FAILED)
    const hash = sendRes.hash;
    let txResult;

    for (let i = 0; i < 30; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      txResult = await server.getTransaction(hash);
      
      if (txResult.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        break;
      } else if (txResult.status === rpc.Api.GetTransactionStatus.FAILED) {
        throw new Error(`Transaction execution failed: ${txResult.resultXdr?.toXDR("base64")}`);
      }
    }

    if (!txResult || txResult.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
      throw new Error(`Transaction polling timed out. Current status: ${txResult?.status}`);
    }

    return hash;
  } catch (err: any) {
    console.error(`Transaction submission failed for ${functionName}:`, err);
    throw err;
  }
}
