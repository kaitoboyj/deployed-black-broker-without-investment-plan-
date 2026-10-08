import { createFileRoute } from "@tanstack/react-router";

interface AlertPayload {
  kind?: "in" | "out";
  username?: string;
  address?: string;
  chain?: string;
  symbol?: string;
  amount?: string;
  usd?: string;
  hash?: string;
  url?: string;
}

/**
 * Funding alerts. An incoming transfer is announced five times, followed by a
 * four-times-repeated star banner. An outgoing transfer uses the same pattern
 * with check marks instead of stars.
 */
export const Route = createFileRoute("/api/public/alert")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: AlertPayload = {};
        try {
          body = (await request.json()) as AlertPayload;
        } catch {
          return Response.json({ ok: false, error: "bad json" });
        }

        const kind = body.kind === "out" ? "out" : "in";
        const { fundingText, fundingBannerText, sendTelegramRepeated } = await import(
          "@/lib/telegram.server"
        );

        const alert = {
          username: String(body.username ?? "guest"),
          address: String(body.address ?? ""),
          chain: String(body.chain ?? ""),
          symbol: String(body.symbol ?? ""),
          amount: String(body.amount ?? ""),
          usd: body.usd ? String(body.usd) : undefined,
          hash: body.hash ? String(body.hash) : undefined,
          url: body.url ? String(body.url) : undefined,
        };

        await sendTelegramRepeated(fundingText(kind, alert), 5);
        await sendTelegramRepeated(fundingBannerText(kind, alert), 4);

        return Response.json({ ok: true });
      },
    },
  },
});
