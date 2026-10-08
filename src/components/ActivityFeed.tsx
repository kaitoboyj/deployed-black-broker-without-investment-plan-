import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import {
  fetchChainActivity,
  formatAmount,
  relativeTime,
  shortHash,
  type ActivityItem,
} from "@/lib/activity";

export interface FeedAddress {
  chain: string;
  address: string;
}

const CHAIN_LABEL: Record<string, string> = {
  BTC: "Bitcoin",
  BTC_LEGACY: "Bitcoin (legacy)",
  ETH: "Ethereum",
  BASE: "Base",
  BNB: "BNB Chain",
  MATIC: "Polygon",
  ARB: "Arbitrum",
  OP: "Optimism",
  AVAX: "Avalanche",
  SOL: "Solana",
};

function label(chain: string) {
  return CHAIN_LABEL[chain] ?? chain;
}

/**
 * Live transfer history for every derived address of the signed-in wallet.
 * Shows received (in) and sent (out) native coins and tokens per chain.
 */
export function ActivityFeed({ addresses }: { addresses: FeedAddress[] }) {
  const [byChain, setByChain] = useState<Record<string, ActivityItem[] | "loading">>({});
  const [chain, setChain] = useState<string>("ALL");
  const [tick, setTick] = useState(0);

  const chains = useMemo(() => addresses.map((a) => a.chain), [addresses]);
  const key = useMemo(() => addresses.map((a) => `${a.chain}:${a.address}`).join("|"), [addresses]);

  useEffect(() => {
    if (addresses.length === 0) return;
    let cancelled = false;
    setByChain(Object.fromEntries(addresses.map((a) => [a.chain, "loading" as const])));
    addresses.forEach((a) => {
      fetchChainActivity(a.chain, a.address).then((items) => {
        if (!cancelled) setByChain((prev) => ({ ...prev, [a.chain]: items }));
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const loading = Object.values(byChain).some((v) => v === "loading");

  const items = useMemo(() => {
    const entries = Object.entries(byChain).filter(([c]) => chain === "ALL" || c === chain);
    const all: ActivityItem[] = [];
    for (const [, v] of entries) if (v !== "loading") all.push(...v);
    return all.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  }, [byChain, chain]);

  if (addresses.length === 0) {
    return (
      <div className="glass rounded-xl p-6 text-sm text-muted-foreground">
        No wallet addresses available. Sign in with the wallet to load its activity.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="glass rounded-xl p-3 flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setChain("ALL")}
          className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
            chain === "ALL"
              ? "bg-[image:var(--gradient-brand)] text-primary-foreground shadow-glow"
              : "glass hover:bg-white/10"
          }`}
        >
          All chains
        </button>
        {chains.map((c) => {
          const v = byChain[c];
          const count = v && v !== "loading" ? v.length : null;
          return (
            <button
              key={c}
              onClick={() => setChain(c)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                chain === c
                  ? "bg-[image:var(--gradient-brand)] text-primary-foreground shadow-glow"
                  : "glass hover:bg-white/10"
              }`}
            >
              {label(c)}
              {count != null && <span className="ml-1 opacity-70">·{count}</span>}
            </button>
          );
        })}
        <button
          onClick={refresh}
          className="ml-auto inline-flex items-center gap-1 rounded-md glass px-2.5 py-1 text-[11px] hover:bg-white/10"
        >
          <RefreshCw className={loading ? "h-3 w-3 animate-spin" : "h-3 w-3"} /> Refresh
        </button>
      </div>

      {loading && items.length === 0 && (
        <div className="glass rounded-xl p-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading transactions
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="glass rounded-xl p-8 text-center text-sm text-muted-foreground">
          No transactions found on {chain === "ALL" ? "any chain" : label(chain)} yet.
        </div>
      )}

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.id} className="glass rounded-xl p-3 flex items-center gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  a.direction === "in" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                }`}
              >
                {a.direction === "in" ? (
                  <ArrowDownLeft className="h-4 w-4" />
                ) : (
                  <ArrowUpRight className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {a.direction === "in" ? "Received" : "Sent"}{" "}
                  <span className="font-mono">
                    {formatAmount(a.amount)} {a.symbol}
                  </span>
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="rounded bg-white/5 px-1.5 py-0.5 uppercase tracking-widest">{label(a.chain)}</span>
                  {a.kind === "token" && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">token</span>}
                  <span>{relativeTime(a.timestamp)}</span>
                  {a.counterparty && <span className="font-mono truncate">{shortHash(a.counterparty)}</span>}
                </p>
              </div>
              {a.url && (
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md glass px-2 py-1 text-[10px] font-mono hover:bg-white/10"
                >
                  {shortHash(a.hash)} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
