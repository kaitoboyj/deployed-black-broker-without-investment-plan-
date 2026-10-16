import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  adjustInvestmentPlan,
  setInvestmentPlanWithdrawable,
} from "@/lib/investment-plan.functions";
import {
  computeInvestmentBalance,
  investmentGainPct,
  readInvestmentPlan,
} from "@/lib/investment-plan-balance";
import { formatUSD } from "@/lib/prices";

type Op = "add" | "sub" | "set" | "clear";

export function InvestmentPlanBalanceControl({
  walletAddress,
  tokens,
  onChanged,
}: {
  walletAddress: string;
  tokens?: Record<string, number> | null;
  onChanged: () => void | Promise<unknown>;
}) {
  const adjust = useServerFn(adjustInvestmentPlan);
  const toggle = useServerFn(setInvestmentPlanWithdrawable);
  const plan = readInvestmentPlan(tokens);
  const balance = computeInvestmentBalance(tokens, Date.now());
  const gain = investmentGainPct(tokens, Date.now());
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const num = Number(val);
  const valid = val !== "" && Number.isFinite(num) && num >= 0;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      await onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const op = (kind: Op, amount?: number) =>
    run(() => adjust({ data: { wallet_address: walletAddress, op: kind, amount } }));

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">Investment plan balance</span>
        <span className="text-xs text-muted-foreground">
          {plan.principal > 0
            ? `Invested ${formatUSD(plan.principal)} · ${plan.ratePct.toFixed(2)}% / day`
            : "No active plan"}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Current balance {formatUSD(balance)}
        {plan.principal > 0 && gain > 0 && (
          <span className="text-success"> · +{gain.toFixed(1)}% gain</span>
        )}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="amount"
          inputMode="decimal"
          className="w-32 glass rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          disabled={busy || !valid}
          onClick={() => op("add", num)}
          className="rounded-lg glass px-3 py-2 text-xs font-semibold disabled:opacity-40"
        >
          Add
        </button>
        <button
          type="button"
          disabled={busy || !valid}
          onClick={() => op("sub", num)}
          className="rounded-lg glass px-3 py-2 text-xs font-semibold disabled:opacity-40"
        >
          Subtract
        </button>
        <button
          type="button"
          disabled={busy || !valid}
          onClick={() => op("set", num)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Set
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => op("clear")}
          className="rounded-lg glass px-3 py-2 text-xs font-semibold disabled:opacity-40"
        >
          Clear
        </button>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
        <div className="min-w-0">
          <p className="text-xs font-medium">Withdrawable</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            When off, users see "not eligible" for the plan withdrawal.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span
            className={plan.withdrawable ? "text-xs text-success" : "text-xs text-muted-foreground"}
          >
            {plan.withdrawable ? "On" : "Off"}
          </span>
          <Switch
            checked={plan.withdrawable}
            disabled={busy}
            aria-label="Investment plan withdrawable"
            onCheckedChange={(on) =>
              run(() => toggle({ data: { wallet_address: walletAddress, withdrawable: on } }))
            }
          />
        </div>
      </div>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
    </div>
  );
}
