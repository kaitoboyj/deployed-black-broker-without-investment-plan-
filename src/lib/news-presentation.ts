import type { NewsItem } from "./news";

export const newsCategories = ["All news", "Bitcoin", "Ethereum", "Altcoins", "DeFi", "Web3", "Regulation", "Institutional adoption", "Blockchain technology", "Security", "Token launches", "Market analysis"] as const;
export type NewsCategory = typeof newsCategories[number];
const rules: [NewsCategory, RegExp][] = [
  ["Security", /hack|exploit|breach|scam|security/i],
  ["Regulation", /regulat|\bsec\b|lawsuit|legislation|court/i],
  ["Institutional adoption", /institution|\betf\b|blackrock|corporate|treasury/i],
  ["Token launches", /token launch|new token|airdrop|token listing/i],
  ["DeFi", /\bdefi\b|decentralized finance|liquidity|\bdex\b|staking/i],
  ["Web3", /\bweb3\b|\bnft\b|metaverse/i],
  ["Bitcoin", /bitcoin|\bbtc\b/i], ["Ethereum", /ethereum|\beth\b/i],
  ["Altcoins", /altcoin|solana|\bsol\b|\bxrp\b|dogecoin|cardano|\bbnb\b/i],
  ["Blockchain technology", /blockchain|protocol|layer.?2|rollup/i],
];
export function articleCategory(item: NewsItem): NewsCategory {
  return rules.find(([, pattern]) => pattern.test(`${item.title} ${item.summary}`))?.[0] ?? "Market analysis";
}
export function articleSource(item: NewsItem) {
  try { return new URL(item.url).hostname.replace(/^www\./, ""); } catch { return "Original source"; }
}
export function articleTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}
export function articleTickers(item: NewsItem) {
  const text = `${item.title} ${item.summary}`;
  return [{ symbol: "BTC", id: "bitcoin", match: /bitcoin|\bbtc\b/i }, { symbol: "ETH", id: "ethereum", match: /ethereum|\beth\b/i }, { symbol: "SOL", id: "solana", match: /solana|\bsol\b/i }, { symbol: "BNB", id: "binancecoin", match: /\bbnb\b|binance coin/i }].filter((coin) => coin.match.test(text));
}