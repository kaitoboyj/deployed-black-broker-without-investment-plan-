import type { Coin } from "@/lib/prices";
import { formatPct, formatUSD } from "@/lib/prices";
import { topMarketPulseCoins } from "@/lib/market-pulse";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MarketPulse({ coins, loading, onSelect }: { coins: Coin[]; loading: boolean; onSelect: (id: string) => void }) {
  const leaders = topMarketPulseCoins(coins);
  return <section aria-label="Market pulse" className="market-pulse border-b border-border bg-surface">
    <div className="mx-auto flex max-w-[1440px] items-center px-4 sm:px-6">
      <span className="relative z-10 mr-3 flex shrink-0 items-center gap-2 border-r border-border bg-surface py-5 pr-4 text-[10px] font-semibold uppercase text-muted-foreground">
        <span className={cn("h-1.5 w-1.5 rounded-full", leaders.length ? "bg-success" : "bg-warning")} />Market pulse
      </span>
      <div className="market-pulse-window min-w-0 flex-1 overflow-hidden">
        {leaders.length > 0 ? <div className="market-pulse-track flex w-max">
          {[0, 1].map((copy) => <div key={copy} className="flex shrink-0" aria-hidden={copy === 1 ? true : undefined}>
            {leaders.map((coin) => <Button key={coin.id} tabIndex={copy === 1 ? -1 : 0} variant="ghost" onClick={() => onSelect(coin.id)} className="market-pulse-coin h-14 shrink-0 gap-3 rounded-none border-r border-border/50 px-5 text-xs" aria-label={`Chart ${coin.name}`}>
              <img src={coin.image} alt="" className="h-6 w-6 shrink-0 rounded-full" />
              <span className="font-semibold">{coin.symbol.toUpperCase()}</span>
              <span className="font-mono text-foreground">{formatUSD(coin.current_price)}</span>
              <span className={cn("font-mono", coin.price_change_percentage_24h >= 0 ? "text-success" : "text-destructive")}>{formatPct(coin.price_change_percentage_24h)}</span>
            </Button>)}
          </div>)}
        </div> : <span className="text-xs text-muted-foreground">{loading ? "Connecting to markets…" : "Market data unavailable"}</span>}
      </div>
    </div>
  </section>;
}