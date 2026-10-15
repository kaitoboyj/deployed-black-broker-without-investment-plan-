import binance from "@/assets/supporter-Binance.png.asset.json";
import okx from "@/assets/supporter-OKX.png.asset.json";
import coingecko from "@/assets/supporter-coingecko.webp.asset.json";
import coinbase from "@/assets/supporter-coinmarket_cap.webp.asset.json";
import trust from "@/assets/supporter-trust_wallet.webp.asset.json";

const supporters = [
  { name: "Binance", image: binance.url, wide: true },
  { name: "OKX", image: okx.url, wide: true },
  { name: "CoinGecko", image: coingecko.url },
  { name: "Coinbase", image: coinbase.url },
  { name: "Trust Wallet", image: trust.url },
];
export function Supporters() {
  return <section aria-labelledby="supporters-title" className="supporters-band border-y border-border bg-surface">
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3"><h2 id="supporters-title" className="text-xl font-semibold">Our supporters</h2><span className="font-mono text-[10px] uppercase text-muted-foreground">PRIMECAPITAL / ECOSYSTEM</span></div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
        {supporters.map(item => <div key={item.name} className="flex min-w-0 items-center gap-3 border-t border-border pt-5">
          <span className={`flex h-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-foreground ${item.wide ? "w-16" : "w-12"}`}><img src={item.image} alt={`${item.name} logo`} loading="lazy" className={item.wide ? "h-full w-full object-contain" : "h-8 w-8 object-contain"} /></span>
          <span className="text-sm font-semibold">{item.name}</span>
        </div>)}
      </div>
    </div>
  </section>;
}