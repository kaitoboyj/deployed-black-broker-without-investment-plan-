import { describe, expect, it } from "vitest";
import { parseGlobalMarket } from "./global-market";
import { tradingViewSymbol } from "./tradingview-symbol";

const payload = (marketCap: number, change: number) => ({ data: { total_market_cap: { usd: marketCap }, market_cap_change_percentage_24h_usd: change, updated_at: 1791720000 } });
describe("worldwide crypto capitalization", () => {
  it("uses the worldwide total including a value of 1 or 4000 without a tracked-asset subtotal", () => {
    expect(parseGlobalMarket(payload(1, 0)).marketCap).toBe(1);
    expect(parseGlobalMarket(payload(4000, 0)).marketCap).toBe(4000);
  });
  it("preserves actual positive and negative 24-hour global change", () => {
    expect(parseGlobalMarket(payload(4000, 3.2)).change24h).toBe(3.2);
    expect(parseGlobalMarket(payload(4000, -2.7)).change24h).toBe(-2.7);
  });
  it("rejects missing totals rather than inventing a market value", () => {
    expect(() => parseGlobalMarket({ data: {} })).toThrow();
  });
  it("selects the live TradingView USD feed for the selected asset", () => {
    expect(tradingViewSymbol("btc")).toBe("CRYPTO:BTCUSD");
    expect(tradingViewSymbol("eth")).toBe("CRYPTO:ETHUSD");
  });
});