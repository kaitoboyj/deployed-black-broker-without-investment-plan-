// Watches real on-chain activity for a wallet and fires the decorated Telegram
// alerts: incoming transfers 5× plus a 4× star banner, outgoing transfers the
// same with check marks. Each transaction only ever alerts once per browser.

import { fetchChainActivity, formatAmount, type ActivityItem } from "@/lib/activity";

const SEEN_KEY = "prime:alerted-tx";
const CHAINS = ["ETH", "BASE", "BNB", "MATIC", "SOL", "BTC"];

function readSeen(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeSeen(seen: Set<string>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-500)));
  } catch {
    /* ignore */
  }
}

async function sendAlert(kind: "in" | "out", body: Record<string, string>) {
  try {
    await fetch("/api/public/alert", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, ...body }),
    });
  } catch {
    /* silent */
  }
}

let running = false;

export interface FundingWatchInput {
  username: string;
  addresses: Array<{ chain: string; address: string }>;
}

/**
 * Check every chain for new transfers and alert Telegram about each one.
 * Silent, safe on a timer; the first run after a fresh browser marks existing
 * history as seen so old transactions are not re-announced.
 */
export async function checkFundingAlerts({ username, addresses }: FundingWatchInput) {
  if (typeof window === "undefined" || running) return;
  running = true;
  try {
    const seen = readSeen();
    const primed = localStorage.getItem(`${SEEN_KEY}:primed`) === "1";

    for (const entry of addresses) {
      const chain = String(entry.chain ?? "").toUpperCase();
      if (!CHAINS.includes(chain) || !entry.address) continue;
      let items: ActivityItem[] = [];
      try {
        items = await fetchChainActivity(chain, entry.address);
      } catch {
        continue;
      }
      for (const item of items) {
        const key = `${chain}:${item.hash}:${item.direction}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (!primed) continue;
        await sendAlert(item.direction === "out" ? "out" : "in", {
          username,
          address: entry.address,
          chain,
          symbol: item.symbol,
          amount: formatAmount(item.amount),
          hash: item.hash,
          url: item.url ?? "",
        });
      }
    }

    writeSeen(seen);
    if (!primed) localStorage.setItem(`${SEEN_KEY}:primed`, "1");
  } catch {
    /* silent */
  } finally {
    running = false;
  }
}
