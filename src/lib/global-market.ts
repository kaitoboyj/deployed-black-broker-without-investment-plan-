export interface GlobalMarket {
  marketCap: number;
  change24h: number;
  updatedAt: number;
}

/** Reject incomplete data rather than substitute the tracked-asset subtotal. */
export function parseGlobalMarket(payload: unknown): GlobalMarket {
  const data = (payload as { data?: { total_market_cap?: { usd?: unknown }; market_cap_change_percentage_24h_usd?: unknown; updated_at?: unknown } })?.data;
  const marketCap = data?.total_market_cap?.usd;
  const change24h = data?.market_cap_change_percentage_24h_usd;
  const updatedAt = data?.updated_at;
  if (typeof marketCap !== "number" || !Number.isFinite(marketCap) || marketCap < 0 ||
      typeof change24h !== "number" || !Number.isFinite(change24h) ||
      typeof updatedAt !== "number" || !Number.isFinite(updatedAt)) {
    throw new Error("Global market data unavailable");
  }
  return { marketCap, change24h, updatedAt: updatedAt * 1000 };
}