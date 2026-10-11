import { describe, expect, it } from "vitest";
import { formatMarketCapitalization, topMarketPulseCoins } from "./market-pulse";
import type { Coin } from "./prices";

describe("Market pulse requirements", () => {
  it("displays the supplied worldwide total as 2.8T", () => {
    expect(formatMarketCapitalization(2_818_781_034_008)).toBe("2.8T");
  });
  it("switches the suffix to B for billions", () => {
    expect(formatMarketCapitalization(2_818_781_034)).toBe("2.8B");
  });
  it("includes exactly the top ten ranked assets without changing the source order", () => {
    const coins = Array.from({ length: 12 }, (_, i) => ({ id: String(12 - i), market_cap_rank: 12 - i }) as Coin);
    expect(topMarketPulseCoins(coins).map((coin) => coin.market_cap_rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(coins[0].market_cap_rank).toBe(12);
  });
});