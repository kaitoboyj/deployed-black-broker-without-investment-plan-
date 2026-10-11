import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Coin } from "@/lib/prices";
import { tradingViewSymbol } from "@/lib/tradingview-symbol";

export function MarketPriceChart({ coin }: { coin?: Coin }) {
  const symbol = coin ? tradingViewSymbol(coin.symbol) : "";
  const [loadedSymbol, setLoadedSymbol] = useState("");
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    setTimedOut(false);
    const timer = setTimeout(() => setTimedOut(true), 20_000);
    return () => clearTimeout(timer);
  }, [symbol]);
  const params = new URLSearchParams({ symbol, interval: "60", theme: "dark", style: "1", timezone: "Etc/UTC", locale: "en", withdateranges: "1", hide_side_toolbar: "0", allow_symbol_change: "1", save_image: "0", studies: "Volume@tv-basicstudies", hideideas: "1" });
  return <div className="relative h-[400px] w-full border-t border-border sm:h-[460px]">
    {coin ? <>
      {loadedSymbol !== symbol && <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground" role="status">{timedOut ? "TradingView is taking longer to connect…" : "Connecting to TradingView…"}</div>}
      <iframe key={symbol} title={`${coin.name} live TradingView chart`} src={`https://s.tradingview.com/widgetembed/?${params}`} className="relative h-full w-full border-0" onLoad={() => setLoadedSymbol(symbol)} allowFullScreen />
      {timedOut && loadedSymbol !== symbol && <Button asChild variant="outline" size="sm" className="absolute bottom-5 left-4"><a href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`} target="_blank" rel="noopener noreferrer">Open TradingView<ExternalLink /></a></Button>}
    </> : <div className="grid h-full place-items-center text-sm text-muted-foreground">Select an asset to view its live chart</div>}
  </div>;
}
