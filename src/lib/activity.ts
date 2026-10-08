// Client helpers for wallet activity (transfers in / out per chain).

export interface ActivityItem {
  id: string;
  chain: string;
  symbol: string;
  direction: "in" | "out";
  amount: number;
  hash: string;
  timestamp: number | null;
  counterparty: string | null;
  url: string | null;
  kind: "native" | "token";
}

export async function fetchChainActivity(chain: string, address: string): Promise<ActivityItem[]> {
  try {
    const params = new URLSearchParams({ chain, address });
    const res = await fetch(`/api/activity?${params.toString()}`);
    if (!res.ok) return [];
    const json = (await res.json()) as { activities?: ActivityItem[] };
    return json.activities ?? [];
  } catch {
    return [];
  }
}

export function formatAmount(n: number) {
  if (n === 0) return "0";
  if (n < 0.0001) return n.toExponential(2);
  return n.toLocaleString(undefined, { maximumFractionDigits: n < 1 ? 8 : 6 });
}

export function shortHash(h: string) {
  return h.length > 14 ? `${h.slice(0, 8)}…${h.slice(-6)}` : h;
}

export function relativeTime(ts: number | null) {
  if (!ts) return "pending";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}
