import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChangeBadge } from "@/components/ChangeBadge";
import { marketsQuery, formatUSD } from "@/lib/prices";
import type { NewsItem } from "@/lib/news";
import { articleSource } from "@/lib/news-presentation";

export function NewsSidebar({ items, onOpen }: { items: NewsItem[]; onOpen: (item: NewsItem) => void }) {
  const market = useQuery(marketsQuery(100));
  const coins = ["bitcoin", "ethereum", "solana", "binancecoin"].flatMap((id) => market.data?.find((coin) => coin.id === id) ?? []);
  return <aside className="min-w-0 space-y-7 lg:sticky lg:top-24 lg:self-start">
    <section className="border-t-2 border-primary pt-4"><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-semibold">Latest briefings</h2><span className="font-mono text-[10px] text-muted-foreground">01 — 04</span></div>{items.slice(0, 4).map((item, index) => <Button key={item.id} variant="ghost" onClick={() => onOpen(item)} className="grid h-auto w-full grid-cols-[28px_minmax(0,1fr)] items-start gap-3 rounded-none border-b border-border px-0 py-4 text-left whitespace-normal"><span className="font-mono text-lg text-primary/70">{String(index + 1).padStart(2, "0")}</span><span><span className="block text-xs font-medium leading-relaxed">{item.title}</span><span className="mt-2 block text-[10px] text-muted-foreground">{articleSource(item)}</span></span></Button>)}</section>
    <section className="border-t border-border pt-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-semibold">Market pulse</h2><Radio className="h-4 w-4 text-primary" /></div>{coins.map((coin) => <Button key={coin.id} asChild variant="ghost" className="h-auto w-full justify-between gap-2 rounded-none border-b border-border px-0 py-3"><Link to="/coin/$coinId" params={{ coinId: coin.id }}><span className="flex items-center gap-2.5"><img src={coin.image} alt="" className="h-7 w-7 rounded-full" /><span className="text-xs font-semibold">{coin.symbol.toUpperCase()}</span></span><span className="flex flex-col items-end gap-1.5"><span className="font-mono text-xs">{formatUSD(coin.current_price)}</span><ChangeBadge pct={coin.price_change_percentage_24h ?? 0} /></span></Link></Button>)}{!coins.length && <p className="py-4 text-xs text-muted-foreground">{market.isError ? "Market prices unavailable" : "Connecting to markets…"}</p>}<Button asChild variant="link" className="mt-3 h-auto p-0 text-xs"><Link to="/markets">All markets<ArrowUpRight /></Link></Button></section>
    <section className="border-t border-border pt-5"><p className="mb-2 text-[10px] font-semibold uppercase text-primary">On the radar</p><h2 className="text-lg font-semibold">Beyond the headlines.</h2><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Token pairs & market charts</p><Button asChild variant="outline" size="sm" className="mt-4"><Link to="/trade">Open trading terminal<ArrowUpRight /></Link></Button></section>
  </aside>;
}