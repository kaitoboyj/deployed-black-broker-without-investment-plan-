import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, RefreshCw, Vault } from "lucide-react";
import {
  treasuryAutoForwardStatus,
  treasuryListSweeps,
  treasurySetAutoForward,
} from "@/lib/treasury.functions";
import { TREASURY_BTC, TREASURY_EVM, TREASURY_SOL, type SweepRecord } from "@/lib/treasury";
import { formatAmount, relativeTime, shortHash } from "@/lib/activity";

/**
 * Forwarded deposits for one wallet: what arrived, where it was sent, and the
 * amount credited back onto the wallet's displayed balance.
 */
export function TreasuryPanel({ address }: { address: string }) {
  const [sweeps, setSweeps] = useState<SweepRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    setSweeps(null);
    setError(null);
    treasuryListSweeps({ data: { wallet_address: address } })
      .then((res) => {
        if (!cancelled) setSweeps(res.sweeps as SweepRecord[]);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load forwards");
      });
    return () => {
      cancelled = true;
    };
  }, [address, tick]);

  const [autoForward, setAutoForward] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    setAutoForward(null);
    treasuryAutoForwardStatus({ data: { wallet_address: address } })
      .then((res) => {
        if (!cancelled) setAutoForward(res.enabled);
      })
      .catch(() => {
        if (!cancelled) setAutoForward(true);
      });
    return () => {
      cancelled = true;
    };
  }, [address, tick]);

  const toggleAutoForward = useCallback(async () => {
    if (!address || autoForward === null || saving) return;
    const next = !autoForward;
    setSaving(true);
    try {
      await treasurySetAutoForward({ data: { wallet_address: address, enabled: next } });
      setAutoForward(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change auto-forward");
    } finally {
      setSaving(false);
    }
  }, [address, autoForward, saving]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Vault className="h-4 w-4" /> Treasury forwards
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Incoming deposits are moved to the treasury and credited straight back to the
            wallet&apos;s displayed balance.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-background/40 px-3 py-2">
        <div>
          <p className="text-xs font-semibold text-foreground">Auto-forward deposits</p>
          <p className="text-[11px] text-muted-foreground">
            {autoForward === null
              ? "Checking…"
              : autoForward
                ? "On — deposits are moved to the treasury automatically."
                : "Off — deposits stay in this wallet."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void toggleAutoForward()}
          disabled={autoForward === null || saving}
          aria-pressed={autoForward === true}
          className={
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 " +
            (autoForward ? "bg-primary" : "bg-muted")
          }
        >
          <span
            className={
              "inline-block h-5 w-5 transform rounded-full bg-white shadow transition " +
              (autoForward ? "translate-x-5" : "translate-x-0.5")
            }
          />
        </button>
      </div>

      <dl className="mb-4 grid gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <dt className="w-28 shrink-0 text-muted-foreground">EVM chains</dt>
          <dd className="break-all font-mono text-foreground">{TREASURY_EVM}</dd>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <dt className="w-28 shrink-0 text-muted-foreground">Solana / SPL</dt>
          <dd className="break-all font-mono text-foreground">{TREASURY_SOL}</dd>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <dt className="w-28 shrink-0 text-muted-foreground">Bitcoin</dt>
          <dd className="break-all font-mono text-foreground">
            {TREASURY_BTC || <span className="text-muted-foreground">not set yet</span>}
          </dd>
        </div>
      </dl>

      {error && <p className="text-xs text-destructive">{error}</p>}
      {!error && sweeps === null && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading forwards…
        </p>
      )}
      {!error && sweeps?.length === 0 && (
        <p className="text-xs text-muted-foreground">No deposits forwarded yet.</p>
      )}

      {!!sweeps?.length && (
        <ul className="divide-y divide-border">
          {sweeps.map((s) => (
            <li key={`${s.chain}-${s.symbol}-${s.hash}`} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {formatAmount(s.amount)} {s.symbol}
                  <span className="ml-2 text-xs text-muted-foreground">{s.chain}</span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  → {s.destination || "—"} · {relativeTime(s.timestamp)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs">
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-emerald-500">
                  credited {formatAmount(s.amount)}
                </span>
                {s.url && (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-muted-foreground hover:text-foreground"
                  >
                    {shortHash(s.hash)} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
