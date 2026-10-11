import { createFileRoute } from "@tanstack/react-router";
import { applyDexPrices } from "@/lib/dexscreener.server";
import { COINGECKO_KEY, resilientFetch } from "@/lib/api-keys";
import { parseGlobalMarket, type GlobalMarket } from "@/lib/global-market";

const cache = new Map<number, { data: unknown; expires: number; fetchedAt: number }>();
const TTL = 60_000;
const STALE_TTL = 10 * 60_000;
let globalCache: { data: GlobalMarket; expires: number } | undefined;

export const Route = createFileRoute("/api/markets")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("scope") === "global") {
          if (globalCache && globalCache.expires > Date.now()) {
            return Response.json(globalCache.data, { headers: { "cache-control": "no-store" } });
          }
          try {
            const response = await resilientFetch("https://api.coingecko.com/api/v3/global");
            if (!response.ok) throw new Error(`Global market provider ${response.status}`);
            const data = parseGlobalMarket(await response.json());
            globalCache = { data, expires: Date.now() + 30_000 };
            return Response.json(data, { headers: { "cache-control": "no-store" } });
          } catch {
            return Response.json({ error: "Global market data temporarily unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
          }
        }
        const perPage = Math.min(Number(url.searchParams.get("per_page") ?? 100), 250);
        const now = Date.now();
        const hit = cache.get(perPage);

        if (hit && hit.expires > now) {
          return Response.json(hit.data, {
            headers: { "cache-control": "public, max-age=30" },
          });
        }

        const upstream = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=1&sparkline=true&price_change_percentage=1h%2C24h%2C7d`;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8_000);
          const res = await fetch(upstream, {
            headers: {
              accept: "application/json",
              "user-agent": "PrimeCapital/1.0 (+https://primecapital.app)",
              "x-cg-demo-api-key": COINGECKO_KEY,
            },
            signal: controller.signal,
          }).finally(() => clearTimeout(timeout));

          if (!res.ok) throw new Error(`upstream ${res.status}`);
          const data = await applyDexPrices(await res.json());
          cache.set(perPage, { data, expires: now + TTL, fetchedAt: now });
          return Response.json(data, {
            headers: { "cache-control": "public, max-age=30" },
          });
        } catch (err) {
          console.error("[api/markets] upstream fetch failed:", err);
          // Fallback: serve any cached copy for this perPage, else nearest other perPage.
          const fallback = hit ?? [...cache.values()].sort((a, b) => b.fetchedAt - a.fetchedAt)[0];
          if (fallback && now - fallback.fetchedAt < STALE_TTL) {
            return Response.json(fallback.data, {
              headers: { "cache-control": "public, max-age=10" },
            });
          }
          const dexOnly = await applyDexPrices([]).catch(() => []);
          if (dexOnly.length) return Response.json(dexOnly, { headers: { "cache-control": "public, max-age=15" } });
          return Response.json([], {
            status: 200,
            headers: { "cache-control": "no-store", "x-upstream-error": "1" },
          });
        }
      },
    },
  },
});
