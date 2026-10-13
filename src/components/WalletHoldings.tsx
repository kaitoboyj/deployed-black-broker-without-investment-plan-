import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Check,
  Copy,
  Search,
  Wallet,
  Layers3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ChangeBadge } from "@/components/ChangeBadge";
import { formatUSD, type Coin } from "@/lib/prices";
import type { Balance } from "@/lib/balances";
import type { WalletToken } from "@/lib/tokens";

interface Address {
  chain: string;
  name: string;
  address: string;
}
interface Holding {
  id: string;
  chain: string;
  network: string;
  name: string;
  symbol: string;
  amount: number | null;
  price: number | null;
  usd: number | null;
  change: number | null;
  image?: string;
  address: string;
  contract?: string;
}
interface Props {
  addresses: Address[];
  balances: Record<string, Balance | "loading">;
  tokens: WalletToken[];
  markets: Coin[];
  priceSymbols: Record<string, string>;
}

export function WalletHoldings({ addresses, balances, tokens, markets, priceSymbols }: Props) {
  const [network, setNetwork] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Holding | null>(null);
  const [copied, setCopied] = useState(false);
  const holdings = useMemo(() => {
    const native: Holding[] = addresses.map((a) => {
      const balance = balances[a.chain];
      const loaded = balance && balance !== "loading" ? balance : null;
      const symbol = priceSymbols[a.chain] ?? a.chain.toLowerCase();
      const coin = markets.find(
        (c) =>
          c.symbol.toLowerCase() === symbol ||
          (symbol === "pol" && c.symbol.toLowerCase() === "matic"),
      );
      return {
        id: a.chain,
        chain: a.chain,
        network: a.name,
        name: coin?.name ?? a.name,
        symbol: loaded?.symbol ?? symbol.toUpperCase(),
        amount: loaded?.amount ?? null,
        price: coin?.current_price ?? null,
        usd: loaded && coin ? loaded.amount * coin.current_price : null,
        change: coin?.price_change_percentage_24h ?? null,
        image: coin?.image,
        address: a.address,
      };
    });
    return [
      ...native,
      ...tokens.map(
        (t): Holding => ({
          id: `${t.chain}:${t.contract ?? t.symbol}`,
          chain: t.chain,
          network: t.chainName,
          name: t.name || t.symbol,
          symbol: t.symbol,
          amount: t.amount,
          price: t.price,
          usd: t.usd,
          change: null,
          image: markets.find((c) => c.symbol.toLowerCase() === t.symbol.toLowerCase())?.image,
          address: addresses.find((a) => a.chain === t.chain)?.address ?? "",
          contract: t.contract,
        }),
      ),
    ];
  }, [addresses, balances, tokens, markets, priceSymbols]);
  const filtered = holdings.filter(
    (h) =>
      (network === "all" || h.chain === network) &&
      `${h.name} ${h.symbol} ${h.network}`.toLowerCase().includes(search.toLowerCase()),
  );
  const valued = holdings
    .filter((h) => h.usd != null && h.usd > 0)
    .sort((a, b) => (b.usd ?? 0) - (a.usd ?? 0));
  const assetTotal = valued.reduce((s, h) => s + (h.usd ?? 0), 0);
  const segments = valued.slice(0, 4);
  const share = (h: Holding) => (assetTotal > 0 ? ((h.usd ?? 0) / assetTotal) * 100 : 0);
  const copyAddress = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(selected.address);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <>
      <div className="grid gap-6 border-y border-border py-6 md:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Asset allocation</h3>
            <span className="text-[10px] text-muted-foreground">Asset balances only</span>
          </div>
          <div
            className="mt-5 flex h-3 overflow-hidden rounded-sm bg-muted"
            aria-label="Asset allocation"
          >
            {segments.map((h, i) => (
              <svg
                key={h.id}
                width={`${share(h)}%`}
                height="12"
                className={`allocation-tone-${i}`}
                aria-label={`${h.symbol} ${share(h).toFixed(1)}%`}
              >
                <rect width="100%" height="12" fill="currentColor" />
              </svg>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3">
            {segments.length ? (
              segments.map((h, i) => (
                <div key={h.id} className="flex items-center gap-2 text-xs">
                  <span className={`allocation-tone-${i}`}>
                    <Layers3 className="h-3 w-3" />
                  </span>
                  <span>
                    {h.symbol}
                    <span className="ml-1 text-[10px] text-muted-foreground">{h.chain}</span>
                  </span>
                  <span className="ml-auto font-mono text-muted-foreground">
                    {share(h).toFixed(1)}%
                  </span>
                </div>
              ))
            ) : (
              <p className="col-span-2 text-xs text-muted-foreground">
                No funded assets available.
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-border pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Networks</p>
            <p className="mt-2 font-mono text-2xl">{addresses.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">{holdings.length} asset entries</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/withdraw">
                <ArrowUpRight />
                Send
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/swap">
                <ArrowLeftRight />
                Swap
              </Link>
            </Button>
          </div>
        </div>
      </div>
      <div className="py-4">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mb-1 text-[10px] uppercase text-primary">Holdings / Multi-chain</p>
            <h3 className="text-xl font-semibold">
              Your assets<span className="text-primary">.</span>
            </h3>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <select
              aria-label="Filter assets by network"
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              className="h-9 max-w-full rounded-md border border-border bg-surface px-3 text-xs"
            >
              <option value="all">All networks</option>
              {addresses.map((a) => (
                <option key={a.chain} value={a.chain}>
                  {a.name}
                </option>
              ))}
            </select>
            <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-surface px-3 sm:w-48">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                aria-label="Search wallet assets"
                placeholder="Search assets"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full min-w-0 bg-transparent text-xs outline-none"
              />
            </label>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[670px] text-xs">
            <thead className="border-y border-border bg-surface text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-3 text-left font-medium">Asset</th>
                <th className="px-3 text-left font-medium">Network</th>
                <th className="px-3 text-right font-medium">Balance</th>
                <th className="px-3 text-right font-medium">Spot price</th>
                <th className="px-3 text-right font-medium">Value</th>
                <th className="px-3 text-right font-medium">24h</th>
                <th className="px-3 text-right font-medium">Receive</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((h) => (
                <tr key={h.id} className="border-b border-border/60 hover:bg-surface">
                  <td className="px-3 py-4">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSelected(h);
                        setCopied(false);
                      }}
                      className="h-auto justify-start p-0 text-left hover:bg-transparent"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                        {h.image ? (
                          <img src={h.image} alt="" className="h-7 w-7 rounded-full" />
                        ) : (
                          <Wallet className="text-primary" />
                        )}
                      </span>
                      <span>
                        <span className="block text-xs font-semibold">{h.name}</span>
                        <span className="text-[10px] text-muted-foreground">{h.symbol}</span>
                      </span>
                    </Button>
                  </td>
                  <td className="px-3">
                    <span className="rounded border border-border bg-surface px-2 py-1 text-[10px] text-muted-foreground">
                      {h.chain}
                    </span>
                  </td>
                  <td className="px-3 text-right font-mono">
                    {h.amount == null
                      ? "—"
                      : h.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                  </td>
                  <td className="px-3 text-right font-mono text-muted-foreground">
                    {h.price == null ? "—" : formatUSD(h.price)}
                  </td>
                  <td className="px-3 text-right font-mono">
                    {h.usd == null ? "—" : formatUSD(h.usd)}
                  </td>
                  <td className="px-3 text-right">
                    {h.change == null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <ChangeBadge pct={h.change} />
                    )}
                  </td>
                  <td className="px-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Receive ${h.symbol} on ${h.network}`}
                      title={`Receive ${h.symbol}`}
                      onClick={() => {
                        setSelected(h);
                        setCopied(false);
                      }}
                    >
                      <ArrowDownLeft className="text-primary" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No assets match your filters.
          </p>
        )}
      </div>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="rounded-lg">
          {selected && (
            <>
              <DialogTitle>
                {selected.name} · {selected.network}
              </DialogTitle>
              <DialogDescription>
                Receive {selected.symbol} on {selected.network}.
              </DialogDescription>
              <div className="border-y border-border py-4">
                <p className="text-[10px] uppercase text-muted-foreground">Balance</p>
                <p className="mt-2 font-mono text-xl">
                  {selected.amount?.toLocaleString(undefined, { maximumFractionDigits: 8 }) ?? "—"}{" "}
                  {selected.symbol}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Public receiving address</p>
              <p className="break-all rounded-md border border-border bg-surface p-3 font-mono text-xs">
                {selected.address}
              </p>
              <Button variant="outline" onClick={() => void copyAddress()}>
                {copied ? <Check /> : <Copy />}
                {copied ? "Copied" : "Copy address"}
              </Button>
              {selected.contract && (
                <p className="break-all font-mono text-[10px] text-muted-foreground">
                  Contract: {selected.contract}
                </p>
              )}
              <p className="text-xs text-warning">
                Use the matching network. Never share your recovery phrase.
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
