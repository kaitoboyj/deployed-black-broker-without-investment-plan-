import { describe, expect, it } from "vitest";
import { articleCategory, articleSource, articleTickers } from "./news-presentation";
import type { NewsItem } from "./news";

const story = (title: string): NewsItem => ({ id: "1", title, summary: "", url: "https://www.coindesk.com/markets/story", publishedAt: "2026-10-11T16:00:00Z" });
describe("news presentation data", () => {
  it("derives the publisher from the original article link", () => {
    expect(articleSource(story("Bitcoin"))).toBe("coindesk.com");
  });
  it("recognizes the asset mentioned in a real headline", () => {
    expect(articleTickers(story("Bitcoin and Ethereum markets" )).map((coin) => coin.id)).toEqual(["bitcoin", "ethereum"]);
  });
  it("prioritizes security reporting over the affected asset topic", () => {
    expect(articleCategory(story("Ethereum protocol exploit"))).toBe("Security");
    expect(articleCategory(story("Bitcoin price rebounds"))).toBe("Bitcoin");
  });
});