import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, ChartNoAxesCombined, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatUSD, type Coin } from "@/lib/prices";
import { cn } from "@/lib/utils";

export function MarketPriceChart({ coin }: { coin?: Coin }) {
  const [period, setPeriod] = useState<"24H" | "7D">("7D");
  const [mode, setMode] = useState<"area" | "line">("area");
  const points = useMemo(() => {
    const prices = coin?.sparkline_in_7d?.price ?? [];
    const visible = period === "24H" ? prices.slice(-24) : prices;
    return visible.map((price, index) => ({ index, price }));
  }, [coin, period]);
  const axis = <><CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false} /><XAxis dataKey="index" tickLine={false} axisLine={false} minTickGap={60} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickFormatter={(index) => period === "24H" ? `${24 - index}h ago` : `${Math.max(0, Math.ceil((points.length - index) / 24))}d ago`} /><YAxis orientation="right" domain={["auto", "auto"]} tickLine={false} axisLine={false} width={78} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickFormatter={(value) => formatUSD(value, { maximumFractionDigits: 0, minimumFractionDigits: 0 })} /><Tooltip contentStyle={{ background: "var(--popover)", borderColor: "var(--border)", borderRadius: 6, color: "var(--foreground)" }} labelFormatter={() => `${coin?.symbol.toUpperCase()} / USD`} formatter={(value: number) => [formatUSD(value), "Price"]} /></>;
  return <>
    <div className="flex items-center justify-between gap-2 border-y border-border px-4 py-2">
      <div className="flex items-center gap-1"><Activity className="mr-2 h-3.5 w-3.5 text-muted-foreground" />{(["24H", "7D"] as const).map((value) => <Button key={value} variant="ghost" size="sm" onClick={() => setPeriod(value)} aria-pressed={period === value} className={cn("h-7 px-2.5 font-mono", period === value ? "bg-primary/10 text-primary" : "text-muted-foreground")}>{value}</Button>)}</div>
      <div className="flex gap-1"><Button variant="ghost" size="icon" className={cn("h-7 w-7", mode === "area" && "text-primary bg-primary/10")} aria-label="Area chart" title="Area chart" onClick={() => setMode("area")}><ChartNoAxesCombined /></Button><Button variant="ghost" size="icon" className={cn("h-7 w-7", mode === "line" && "text-primary bg-primary/10")} aria-label="Line chart" title="Line chart" onClick={() => setMode("line")}><TrendingUp /></Button></div>
    </div>
    <div className="h-[300px] w-full px-2 pt-6 font-mono sm:h-[330px]" aria-label={`${coin?.name ?? "Asset"} price history`}>
      {points.length > 1 ? <ResponsiveContainer width="100%" height="100%">{mode === "area" ? <AreaChart data={points} margin={{ top: 8, right: 0, bottom: 8, left: 8 }}><defs><linearGradient id="market-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.24} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0} /></linearGradient></defs>{axis}<Area type="monotone" dataKey="price" stroke="var(--primary)" strokeWidth={2} fill="url(#market-chart-fill)" isAnimationActive={false} /></AreaChart> : <LineChart data={points} margin={{ top: 8, right: 0, bottom: 8, left: 8 }}>{axis}<Line type="monotone" dataKey="price" stroke="var(--primary)" strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart>}</ResponsiveContainer> : <div className="grid h-full place-items-center text-sm text-muted-foreground">{coin ? "Price history unavailable for this asset" : "Loading price history…"}</div>}
    </div>
  </>;
}