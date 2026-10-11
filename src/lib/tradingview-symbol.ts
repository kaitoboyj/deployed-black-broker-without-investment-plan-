/** Aggregate USD feeds avoid implying every tracked coin trades on Binance. */
export function tradingViewSymbol(symbol: string) {
  return `CRYPTO:${symbol.toUpperCase().replace(/[^A-Z0-9]/g, "")}USD`;
}