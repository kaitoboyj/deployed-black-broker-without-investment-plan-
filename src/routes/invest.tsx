import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowUpRight, Bot, CheckCircle2, Clock3, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { dailyPlanReturn, getDisabledPlanIds, investmentPlans, planGroups, setDisabledPlanIds, type InvestmentPlan } from "@/lib/investment-plans";
import { getDisabledPlans } from "@/lib/plan-settings.functions";
import { formatUSD } from "@/lib/prices";
import { useInvestmentBalance } from "@/hooks/useInvestmentBalance";
import financeImage from "@/assets/home-finance.jpg";

export const Route = createFileRoute("/invest")({
  head: () => ({ meta: [
    { title: "Investment Plans — PrimeCapital" },
    { name: "description", content: "Explore PrimeCapital robotic trading plan simulations, durations, illustrative daily returns and wallet balance eligibility." },
    { property: "og:title", content: "Investment Plans — PrimeCapital" },
    { property: "og:description", content: "Compare short, mid and long term investment plan simulations with transparent illustrative returns." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: InvestmentPage,
});

type Flow = "unavailable" | "topup" | "confirm" | "processing" | "success" | "error";
function InvestmentPage() {
  const wallet = useInvestmentBalance();
  const read = useServerFn(getDisabledPlans);
  const client = useQueryClient();
  const settings = useQuery({ queryKey: ["investment-plan-settings"], queryFn: () => read(), refetchInterval: 30_000, refetchOnWindowFocus: true });
  const [fallback, setFallback] = useState<string[]>([]);
  const [selected, setSelected] = useState<InvestmentPlan | null>(null);
  const [flow, setFlow] = useState<Flow>("confirm");
  const [checking, setChecking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const generation = useRef(0);
  useEffect(() => { setFallback(getDisabledPlanIds()); return () => { generation.current++; if (timer.current) clearTimeout(timer.current); }; }, []);
  useEffect(() => { if (settings.data?.available) { setDisabledPlanIds(settings.data.disabled); setFallback(settings.data.disabled); } }, [settings.data]);
  const disabled = settings.data?.available ? settings.data.disabled : fallback;
  const openPlan = (plan: InvestmentPlan) => {
    setSelected(plan);
    setFlow(disabled.includes(plan.id) ? "unavailable" : !wallet.session || wallet.balance < plan.amount ? "topup" : "confirm");
  };
  const close = () => { generation.current++; if (timer.current) clearTimeout(timer.current); setSelected(null); setChecking(false); };
  async function activate() {
    if (!selected || checking) return;
    const attempt = generation.current;
    setChecking(true);
    try {
      const current = await read();
      if (attempt !== generation.current) return;
      if (!current.available) { setFlow("error"); return; }
      client.setQueryData(["investment-plan-settings"], current);
      if (current.disabled.includes(selected.id)) { setFlow("unavailable"); return; }
      if (!wallet.session || wallet.balance < selected.amount) { setFlow("topup"); return; }
      setFlow("processing");
      timer.current = setTimeout(() => setFlow("success"), 3000);
    } catch { if (attempt === generation.current) setFlow("error"); }
    finally { if (attempt === generation.current) setChecking(false); }
  }
  return <main>
    <section className="relative isolate overflow-hidden border-b border-border">
      <img src={financeImage} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-background/85" />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <p className="flex items-center gap-2 text-xs text-primary"><Bot className="h-4 w-4" />ROBOTIC TRADING</p>
        <h1 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">Robotic Trading · Investment Plans</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">Explore automated trading and compounding scenarios across short, mid and long terms. The rates below are illustrative plan inputs, not guaranteed earnings.</p>
        <p className="mt-5 inline-flex items-center gap-2 text-xs text-warning"><AlertTriangle className="h-4 w-4 shrink-0" />Simulation only · No funds moved or trades executed</p>
      </div>
    </section>
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <section className="flex flex-wrap items-center justify-between gap-5 border-b border-border py-7">
        <div><p className="flex items-center gap-2 text-xs text-muted-foreground"><Wallet className="h-4 w-4 text-primary" />Available wallet balance</p>
          <p className="mt-2 font-mono text-3xl tabular-nums">{!wallet.session ? "—" : wallet.loading ? "Loading…" : wallet.error ? "Unavailable" : formatUSD(wallet.balance)}</p>
          <p className="mt-2 text-xs text-muted-foreground">{wallet.session ? "Wallet display total · Includes configured yield and balance adjustments" : "Open your wallet to check plan eligibility."}</p>
        </div>
        <Button asChild variant="outline"><Link to="/wallet"><Wallet />{wallet.session ? "Open wallet" : "Connect / open wallet"}<ArrowUpRight /></Link></Button>
      </section>
      {!settings.isPending && !settings.data?.available && <p role="status" className="mt-5 text-xs text-warning">Live plan availability is temporarily unavailable. Activation cannot proceed until it reconnects.</p>}
      {planGroups.map((group, index) => <section key={group.term} className="pt-10">
        <div className="mb-5 flex items-start gap-4"><span className="pt-1 font-mono text-sm text-primary">0{index + 1}</span><div><h2 className="font-display text-2xl font-semibold">{group.title}</h2><p className="mt-1 text-xs text-muted-foreground">{group.subtitle}</p></div></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {investmentPlans.filter((plan) => plan.term === group.term).map((plan) => {
            const off = disabled.includes(plan.id);
            return <article key={plan.id} aria-label={`$${plan.amount} · ${plan.label}`} className={`rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50 ${off ? "opacity-50" : ""}`}>
              <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{plan.label}</span><span className="rounded-md bg-success/10 px-2 py-1 text-xs font-medium text-success">+{plan.dailyReturnPct}% / day</span></div>
              <p className="mt-6 font-mono text-3xl font-semibold tabular-nums">${plan.amount.toLocaleString()}</p>
              <div className="mt-5 flex items-center justify-between gap-2 border-t border-border pt-4"><span className="text-xs text-muted-foreground">Illustrative daily return</span><span className="font-mono text-sm text-success">{formatUSD(dailyPlanReturn(plan))}</span></div>
              <Button className="mt-5 w-full" variant={off || !wallet.session || wallet.balance < plan.amount ? "outline" : "default"} disabled={wallet.loading || wallet.error} onClick={() => openPlan(plan)}>
                {off ? "Plan unavailable" : !wallet.session ? "Start plan" : wallet.balance < plan.amount ? "Insufficient balance" : "Start plan"}<ArrowUpRight />
              </Button>
            </article>;
          })}
        </div>
      </section>)}
      <p className="mt-8 border-t border-border pt-6 text-xs leading-6 text-muted-foreground">Daily figures are amount × daily rate, not a forecast of actual profit. Rates of 3–60% per day are extremely high and should not be treated as realistic or guaranteed. This simulation does not deduct your balance, create an investment or produce returns.</p>
    </div>
    <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 leading-6 tracking-normal">{flow === "unavailable" || flow === "error" ? <AlertTriangle className="h-5 w-5 text-warning" /> : flow === "success" ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Bot className="h-5 w-5 text-primary" />}
            {flow === "unavailable" ? "Plan unavailable" : flow === "topup" ? wallet.session ? "Top up your wallet" : "Open your wallet" : flow === "success" ? "Plan simulation complete" : flow === "processing" ? "Processing simulation…" : flow === "error" ? "Availability check failed" : "Confirm plan simulation"}
          </DialogTitle>
          <DialogDescription>{flow === "unavailable" ? "This plan is currently unavailable. Please choose another plan or try again later." : flow === "topup" ? "Check the required amount against your available wallet balance." : flow === "success" ? "Simulation completed successfully. No money was invested, deducted or transferred; no trading is active." : flow === "processing" ? "Preparing your simulated plan. No funds will move." : flow === "error" ? "Plan availability could not be verified. Please try again later." : "Review this illustrative scenario. Activation is simulated and does not start real trading or guarantee returns."}</DialogDescription>
        </DialogHeader>
        {selected && !["unavailable", "error"].includes(flow) && <dl className="space-y-3 border-y border-border py-4 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Plan amount</dt><dd className="font-mono">{formatUSD(selected.amount)}</dd></div>
          {flow === "topup" ? <><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Your balance</dt><dd className="font-mono">{formatUSD(wallet.balance)}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Additional amount needed</dt><dd className="font-mono">{formatUSD(Math.max(0, selected.amount - wallet.balance))}</dd></div></> : <><div className="flex justify-between"><dt className="text-muted-foreground">Duration</dt><dd>{selected.label}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Illustrative daily rate</dt><dd className="text-success">{selected.dailyReturnPct}%</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Illustrative daily return</dt><dd className="font-mono text-success">{formatUSD(dailyPlanReturn(selected))}</dd></div></>}
        </dl>}
        {flow === "topup" ? <Button asChild><Link to="/wallet" onClick={close}><Wallet />{wallet.session ? "Top up wallet" : "Open wallet"}</Link></Button> : flow === "confirm" ? <Button onClick={activate} disabled={checking}>{checking && <Loader2 className="animate-spin motion-reduce:animate-none" />}Confirm & Activate Plan (simulation)</Button> : flow === "processing" ? <div role="status" className="flex justify-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary motion-reduce:animate-none" /></div> : <Button onClick={close}>{flow === "success" ? "Done" : "OK"}</Button>}
      </DialogContent>
    </Dialog>
  </main>;
}