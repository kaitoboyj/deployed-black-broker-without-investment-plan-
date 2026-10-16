import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Clock3,
  Loader2,
  Timer,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  dailyPlanReturn,
  getDisabledPlanIds,
  investmentPlans,
  parseDurationMs,
  planGroups,
  setDisabledPlanIds,
  type InvestmentPlan,
} from "@/lib/investment-plans";
import { getDisabledPlans } from "@/lib/plan-settings.functions";
import { applyInvestmentPlan } from "@/lib/investment-plan.functions";
import { formatUSD } from "@/lib/prices";
import { useInvestmentBalance } from "@/hooks/useInvestmentBalance";
import { PlanCountdown } from "@/components/PlanCountdown";
import financeImage from "@/assets/home-finance.jpg";

export const Route = createFileRoute("/invest")({
  head: () => ({
    meta: [
      { title: "Investment Plans — PrimeCapital" },
      {
        name: "description",
        content:
          "Explore PrimeCapital robotic trading plans, durations, daily returns and wallet balance eligibility.",
      },
      { property: "og:title", content: "Investment Plans — PrimeCapital" },
      {
        property: "og:description",
        content:
          "Compare short, mid and long term investment plans with transparent daily returns.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvestmentPage,
});

type Flow = "unavailable" | "topup" | "confirm" | "processing" | "success" | "error";
function InvestmentPage() {
  const wallet = useInvestmentBalance();
  const read = useServerFn(getDisabledPlans);
  const apply = useServerFn(applyInvestmentPlan);
  const client = useQueryClient();
  const settings = useQuery({
    queryKey: ["investment-plan-settings"],
    queryFn: () => read(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const [fallback, setFallback] = useState<string[]>([]);
  const [selected, setSelected] = useState<InvestmentPlan | null>(null);
  const [flow, setFlow] = useState<Flow>("confirm");
  const [reapply, setReapply] = useState(false);
  const [appliedIds, setAppliedIds] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    setFallback(getDisabledPlanIds());
    return () => {
      generation.current++;
    };
  }, []);
  useEffect(() => {
    if (settings.data?.available) {
      setDisabledPlanIds(settings.data.disabled);
      setFallback(settings.data.disabled);
    }
  }, [settings.data]);
  const disabled = settings.data?.available ? settings.data.disabled : fallback;
  const investment = wallet.investment;
  const openPlan = (plan: InvestmentPlan) => {
    setSelected(plan);
    setReapply(appliedIds.includes(plan.id) || investment.principal > 0);
    setFlow(
      disabled.includes(plan.id)
        ? "unavailable"
        : !wallet.session || wallet.balance < plan.amount
          ? "topup"
          : "confirm",
    );
  };
  const close = () => {
    generation.current++;
    setSelected(null);
    setChecking(false);
  };
  async function activate() {
    if (!selected || checking || !wallet.session) return;
    const attempt = generation.current;
    setChecking(true);
    try {
      const current = await read();
      if (attempt !== generation.current) return;
      if (!current.available) {
        setFlow("error");
        return;
      }
      client.setQueryData(["investment-plan-settings"], current);
      if (current.disabled.includes(selected.id)) {
        setFlow("unavailable");
        return;
      }
      if (wallet.balance < selected.amount) {
        setFlow("topup");
        return;
      }
      setFlow("processing");
      await apply({
        data: {
          wallet_address: wallet.session.address,
          amount: selected.amount,
          ratePct: selected.dailyReturnPct,
          durationMs: parseDurationMs(selected.duration),
        },
      });
      if (attempt !== generation.current) return;
      setAppliedIds((prev) => (prev.includes(selected.id) ? prev : [...prev, selected.id]));
      await client.invalidateQueries({ queryKey: ["investment-wallet-balance"] });
      setFlow("success");
    } catch {
      if (attempt === generation.current) setFlow("error");
    } finally {
      if (attempt === generation.current) setChecking(false);
    }
  }
  return (
    <main>
      <section className="relative isolate overflow-hidden border-b border-border">
        <img
          src={financeImage}
          alt=""
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-background/85" />
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <p className="flex items-center gap-2 text-xs text-primary">
            <Bot className="h-4 w-4" />
            ROBOTIC TRADING
          </p>
          <h1 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">
            Robotic Trading · Investment Plans
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
            Explore automated trading and compounding across short, mid and long terms.
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <section className="flex flex-wrap items-center justify-between gap-5 border-b border-border py-7">
          <div className="flex flex-wrap gap-x-10 gap-y-5">
            <div>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Wallet className="h-4 w-4 text-primary" />
                Available wallet balance
              </p>
              <p className="mt-2 font-mono text-3xl tabular-nums">
                {!wallet.session
                  ? "—"
                  : wallet.loading
                    ? "Loading…"
                    : wallet.error
                      ? "Unavailable"
                      : formatUSD(wallet.balance)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {wallet.session
                  ? "Available to invest · From your initial balance"
                  : "Open your wallet to check plan eligibility."}
              </p>
            </div>
            {wallet.session && investment.currentBalance > 0 && (
              <div>
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <TrendingUp className="h-4 w-4 text-success" />
                  Investment balance
                </p>
                <p className="mt-2 flex items-center gap-2 font-mono text-3xl tabular-nums">
                  {formatUSD(investment.currentBalance)}
                  {investment.gainPct > 0 && (
                    <span className="rounded-md bg-success/10 px-2 py-1 text-xs font-medium text-success">
                      +{investment.gainPct.toFixed(0)}%
                    </span>
                  )}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Invested {formatUSD(investment.principal)} · {investment.ratePct.toFixed(2)}% /
                  day
                </p>
                {investment.endMs && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Timer className="h-3.5 w-3.5" />
                    Ends in{" "}
                    <PlanCountdown endMs={investment.endMs} className="font-mono text-foreground" />
                  </p>
                )}
              </div>
            )}
          </div>
          <Button asChild variant="outline">
            <Link to="/wallet">
              <Wallet />
              {wallet.session ? "Open wallet" : "Connect / open wallet"}
              <ArrowUpRight />
            </Link>
          </Button>
        </section>
        {!settings.isPending && !settings.data?.available && (
          <p role="status" className="mt-5 text-xs text-warning">
            Live plan availability is temporarily unavailable. Activation cannot proceed until it
            reconnects.
          </p>
        )}
        {planGroups.map((group, index) => (
          <section key={group.term} className="pt-10">
            <div className="mb-5 flex items-start gap-4">
              <span className="pt-1 font-mono text-sm text-primary">0{index + 1}</span>
              <div>
                <h2 className="font-display text-2xl font-semibold">{group.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{group.subtitle}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {investmentPlans
                .filter((plan) => plan.term === group.term)
                .map((plan) => {
                  const off = disabled.includes(plan.id);
                  return (
                    <article
                      key={plan.id}
                      aria-label={`$${plan.amount} · ${plan.label}`}
                      className={`rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50 ${off ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock3 className="h-3.5 w-3.5" />
                          {plan.label}
                        </span>
                        <span className="rounded-md bg-success/10 px-2 py-1 text-xs font-medium text-success">
                          +{plan.dailyReturnPct}% / day
                        </span>
                      </div>
                      <p className="mt-6 font-mono text-3xl font-semibold tabular-nums">
                        ${plan.amount.toLocaleString()}
                      </p>
                      <div className="mt-5 flex items-center justify-between gap-2 border-t border-border pt-4">
                        <span className="text-xs text-muted-foreground">Daily return</span>
                        <span className="font-mono text-sm text-success">
                          {formatUSD(dailyPlanReturn(plan))}
                        </span>
                      </div>
                      <Button
                        className="mt-5 w-full"
                        variant={
                          off || !wallet.session || wallet.balance < plan.amount
                            ? "outline"
                            : "default"
                        }
                        disabled={wallet.loading || wallet.error}
                        onClick={() => openPlan(plan)}
                      >
                        {off
                          ? "Plan unavailable"
                          : !wallet.session
                            ? "Start plan"
                            : wallet.balance < plan.amount
                              ? "Insufficient balance"
                              : "Start plan"}
                        <ArrowUpRight />
                      </Button>
                    </article>
                  );
                })}
            </div>
          </section>
        ))}
      </div>
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 leading-6 tracking-normal">
              {flow === "unavailable" || flow === "error" ? (
                <AlertTriangle className="h-5 w-5 text-warning" />
              ) : flow === "success" ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <Bot className="h-5 w-5 text-primary" />
              )}
              {flow === "unavailable"
                ? "Plan unavailable"
                : flow === "topup"
                  ? wallet.session
                    ? "Top up your wallet"
                    : "Open your wallet"
                  : flow === "success"
                    ? "Plan activated"
                    : flow === "processing"
                      ? "Processing…"
                      : flow === "error"
                        ? "Availability check failed"
                        : reapply
                          ? "Apply for this plan again?"
                          : "Confirm plan"}
            </DialogTitle>
            <DialogDescription>
              {flow === "unavailable"
                ? "This plan is currently unavailable. Please choose another plan or try again later."
                : flow === "topup"
                  ? "Check the required amount against your available wallet balance."
                  : flow === "success"
                    ? "Your plan amount was added to your investment balance."
                    : flow === "processing"
                      ? "Preparing your plan."
                      : flow === "error"
                        ? "Plan availability could not be verified. Please try again later."
                        : reapply
                          ? "You already have an active investment. Confirm to add this amount to your investment balance, or reject to cancel."
                          : "Review your plan details before activation."}
            </DialogDescription>
          </DialogHeader>
          {selected && !["unavailable", "error"].includes(flow) && (
            <dl className="space-y-3 border-y border-border py-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Plan amount</dt>
                <dd className="font-mono">{formatUSD(selected.amount)}</dd>
              </div>
              {flow === "topup" ? (
                <>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Your balance</dt>
                    <dd className="font-mono">{formatUSD(wallet.balance)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Additional amount needed</dt>
                    <dd className="font-mono">
                      {formatUSD(Math.max(0, selected.amount - wallet.balance))}
                    </dd>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Duration</dt>
                    <dd>{selected.label}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Daily rate</dt>
                    <dd className="text-success">{selected.dailyReturnPct}%</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Daily return</dt>
                    <dd className="font-mono text-success">
                      {formatUSD(dailyPlanReturn(selected))}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          )}
          {flow === "topup" ? (
            <Button asChild>
              <Link to="/wallet" onClick={close}>
                <Wallet />
                {wallet.session ? "Top up wallet" : "Open wallet"}
              </Link>
            </Button>
          ) : flow === "confirm" ? (
            reapply ? (
              <div className="flex gap-2">
                <Button className="flex-1" onClick={activate} disabled={checking}>
                  {checking && <Loader2 className="animate-spin motion-reduce:animate-none" />}
                  Confirm
                </Button>
                <Button className="flex-1" variant="outline" onClick={close} disabled={checking}>
                  Reject
                </Button>
              </div>
            ) : (
              <Button onClick={activate} disabled={checking}>
                {checking && <Loader2 className="animate-spin motion-reduce:animate-none" />}Confirm
                & Activate Plan
              </Button>
            )
          ) : flow === "processing" ? (
            <div role="status" className="flex justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary motion-reduce:animate-none" />
            </div>
          ) : (
            <Button onClick={close}>{flow === "success" ? "Done" : "OK"}</Button>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
