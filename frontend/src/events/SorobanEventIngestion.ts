import { scValToNative } from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";
import { RPC_URL, CONTRACTS } from "../contracts/config";

export interface LedgerEventLog {
  id: string;
  contractId: string;
  topic: string;
  groupId: number;
  details: string;
  txHash: string;
  ledger: number;
  timestamp: string;
}

export class SorobanEventIngestion {
  private server: Server;
  private isPolling = false;
  private timerId: any = null;
  private onEventsFetched?: (events: LedgerEventLog[]) => void;

  constructor() {
    this.server = new Server(RPC_URL);
  }

  async fetchRecentEvents(): Promise<LedgerEventLog[]> {
    try {
      // Query events for GroupManager, ExpenseManager, SettlementManager
      const contractIds = [
        CONTRACTS.groupManager,
        CONTRACTS.expenseManager,
        CONTRACTS.settlementManager,
      ].filter(Boolean);

      const latestLedgerRes = await this.server.getLatestLedger();
      const startLedger = Math.max(1, latestLedgerRes.sequence - 10000);

      const response = await this.server.getEvents({
        startLedger,
        filters: [
          {
            type: "contract",
            contractIds,
          },
        ],
        limit: 50,
      });

      const parsedEvents: LedgerEventLog[] = [];

      if (response && response.events) {
        for (const ev of response.events) {
          try {
            const topicsNative = ev.topic.map((t) => scValToNative(t));
            const dataNative = ev.value ? scValToNative(ev.value) : null;
            const topicSymbol = String(topicsNative[0] || "");
            const groupId = Number(topicsNative[1] || 0);

            let details = `On-Chain Action on Group #${groupId}`;

            if (topicSymbol === "grp_cred") {
              details = `Group #${groupId} created on Stellar ledger by ${String(dataNative).slice(0, 6)}...`;
            } else if (topicSymbol === "mem_join") {
              details = `New member ${String(dataNative).slice(0, 6)}... joined Group #${groupId}`;
            } else if (topicSymbol === "mem_left") {
              details = `Member ${String(dataNative).slice(0, 6)}... left Group #${groupId}`;
            } else if (topicSymbol === "exp_add") {
              details = `Expense #${dataNative} added to Group #${groupId}`;
            } else if (topicSymbol === "exp_del") {
              details = `Expense #${dataNative} deleted from Group #${groupId}`;
            } else if (topicSymbol === "debt_rec") {
              details = `Debt recorded in Group #${groupId}`;
            } else if (topicSymbol === "settle_m") {
              details = `Manual debt settlement recorded for Group #${groupId}`;
            } else if (topicSymbol === "settle_t") {
              details = `Token settlement executed on-chain for Group #${groupId}`;
            }

            parsedEvents.push({
              id: ev.id,
              contractId: (ev as any).contractId || "",
              topic: topicSymbol,
              groupId,
              details,
              txHash: ev.txHash,
              ledger: ev.ledger,
              timestamp: ev.ledgerClosedAt || new Date().toISOString(),
            });
          } catch (parseErr) {
            // Ignore unparseable individual events
          }
        }
      }

      // Sort newest first
      parsedEvents.reverse();
      return parsedEvents;
    } catch (err) {
      console.warn("Soroban event ingestion polling notice:", err);
      return [];
    }
  }

  startPolling(onEvents: (events: LedgerEventLog[]) => void, intervalMs = 10000) {
    this.onEventsFetched = onEvents;
    this.isPolling = true;

    const poll = async () => {
      if (!this.isPolling) return;
      const events = await this.fetchRecentEvents();
      if (events.length > 0 && this.onEventsFetched) {
        this.onEventsFetched(events);
      }
      this.timerId = setTimeout(poll, intervalMs);
    };

    poll();
  }

  stopPolling() {
    this.isPolling = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }
}

export const eventIngestion = new SorobanEventIngestion();
