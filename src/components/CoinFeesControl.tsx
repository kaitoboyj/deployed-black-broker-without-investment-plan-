import { useMemo, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import {
  FEE_UNITS,
  formatFeeAmount,
  listCoinFees,
  normalizeCoinSymbol,
  readCoinFee,
  stripWithdrawKeys,
  type FeeUnit,
} from "@/lib/withdraw";

/**
 * "Fees customisation" — override the withdrawal fee for each coin the account
 * holds. ETH can be 0.2 ETH while BNB is 1 BNB or $3. When a coin has its own
 * fee it is used instead of the global green-button fee.
 */
export function CoinFeesControl({
  tokens,
  onSet,
}: {
  tokens?: Record<string, number> | null;
  onSet: (symbol: string, fee: number | null, unit: FeeUnit) => Promise<unknown>;
}) {
  const configured = useMemo(() => listCoinFees(tokens), [tokens]);
  const [drafts, setDrafts] = useState<Record<string, { fee: string; unit: FeeUnit }>>({});
  const [extra, setExtra] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const symbols = useMemo(() => {
    const set = new Set<string>();
    for (const key of Object.keys(stripWithdrawKeys(tokens))) {
      const sym = normalizeCoinSymbol(key);
      if (sym) set.add(sym);
    }
    for (const c of configured) set.add(c.symbol);
    for (const sym of Object.keys(drafts)) set.add(sym);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [tokens, configured, drafts]);

  const draftFor = (symbol: string) => {
    const draft = drafts[symbol];
    if (draft) return draft;
    const stored = readCoinFee(tokens, symbol);
    return { fee: stored ? String(stored.fee) : "", unit: stored ? stored.unit : ("USD" as FeeUnit) };
  };

  const setDraft = (symbol: string, patch: Partial<{ fee: string; unit: FeeUnit }>) =>
    setDrafts((prev) => ({ ...prev, [symbol]: { ...draftFor(symbol), ...patch } }));

  const save = async (symbol: string, fee: number | null, unit: FeeUnit, tag: string) => {
    setBusy(tag);
    setErr(null);
    try {
      await onSet(symbol, fee, unit);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[symbol];
        return next;
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save the fee.");
    } finally {
      setBusy(null);
    }
  };

  const addCoin = () => {
    const sym = normalizeCoinSymbol(extra);
    if (!sym) return;
    setDrafts((prev) => ({ ...prev, [sym]: prev[sym] ?? { fee: "", unit: "USD" } }));
    setExtra("");
  };

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">Fees customisation</span>
        <span className="text-xs text-muted-foreground">
          {configured.length
            ? configured.map((c) => `${c.symbol} ${formatFeeAmount(c.fee, c.unit)}`).join(" · ")
            : "using the global fee"}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Set a different withdrawal fee for each coin in this account. A coin with its own fee uses
        that amount instead of the global send-button fee — e.g. ETH at 0.2 ETH, BNB at 1 BNB or $3.
      </p>

      <div className="mt-3 space-y-2">
        {symbols.length === 0 && (
          <p className="text-[11px] text-muted-foreground">
            No coins found in this account yet. Add one below.
          </p>
        )}
        {symbols.map((symbol) => {
          const draft = draftFor(symbol);
          const stored = readCoinFee(tokens, symbol);
          const num = Number(draft.fee);
          const valid = draft.fee !== "" && Number.isFinite(num) && num >= 0;
          return (
            <div key={symbol} className="flex flex-wrap items-center gap-2">
              <span className="w-20 shrink-0 font-mono text-xs">{symbol}</span>
              <input
                value={draft.fee}
                onChange={(e) => setDraft(symbol, { fee: e.target.value })}
                inputMode="decimal"
                placeholder="fee amount"
                className="w-32 glass rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <select
                value={draft.unit}
                onChange={(e) => setDraft(symbol, { unit: e.target.value as FeeUnit })}
                disabled={busy !== null}
                aria-label={`${symbol} fee unit`}
                className="glass rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              >
                {FEE_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u === "USD" ? "USD ($)" : u}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-muted-foreground">
                Preview: <span className="font-mono">{formatFeeAmount(valid ? num : 0, draft.unit)}</span>
              </span>
              <button
                type="button"
                disabled={busy !== null || !valid}
                onClick={() => save(symbol, num, draft.unit, symbol)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
              >
                {busy === symbol && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
              </button>
              {stored && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => save(symbol, null, "USD", `${symbol}-clear`)}
                  className="inline-flex items-center gap-1 rounded-lg glass px-3 py-2 text-xs font-semibold disabled:opacity-40"
                  title="Remove this coin's fee (fall back to the global fee)"
                >
                  {busy === `${symbol}-clear` ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                  Clear
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
        <input
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder="coin e.g. SOL"
          className="w-40 glass rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          onClick={addCoin}
          disabled={!normalizeCoinSymbol(extra)}
          className="inline-flex items-center gap-1.5 rounded-lg glass px-3 py-2 text-xs font-semibold disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" /> Add coin
        </button>
      </div>

      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
    </div>
  );
}
