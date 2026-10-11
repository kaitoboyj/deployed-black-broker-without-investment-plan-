import type { Coin } from "./prices";

export function topMarketPulseCoins(coins: Coin[]) {
  return [...coins].sort((a, b) => a.market_cap_rank - b.market_cap_rank).slice(0, 10);
}

export function formatMarketCapitalization(value: number) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}