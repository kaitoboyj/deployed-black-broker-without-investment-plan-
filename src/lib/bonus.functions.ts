import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { bonusWriteSchema, readBonus, writeBonus } from "./bonus";

export const setPendingBonus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => bonusWriteSchema.parse(input))
  .handler(async ({ data }) => {
    const { requireMixmanUnlocked } = await import("./mixman.server");
    await requireMixmanUnlocked();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error: lookupError } = await supabaseAdmin.from("wallet_balance_overrides").select("token_overrides").eq("wallet_address", data.wallet_address).maybeSingle();
    if (lookupError) throw new Error("Could not load bonus settings.");
    const token_overrides = writeBonus((row?.token_overrides ?? {}) as Record<string, number>, data.amount, Date.now());
    const { error } = await supabaseAdmin.from("wallet_balance_overrides").upsert({ wallet_address: data.wallet_address, token_overrides }, { onConflict: "wallet_address" });
    if (error) throw new Error("Could not save bonus notice.");
    return { bonus: readBonus(token_overrides) };
  });

export const getPendingBonus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ wallet_address: z.string().regex(/^0x[0-9a-fA-F]{40}$/), issued_at: z.number().int(), signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/) }).parse(input))
  .handler(async ({ data }) => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    setResponseHeader("Cache-Control", "no-store");
    if (Math.abs(Date.now() - data.issued_at) > 60_000) throw new Error("Ownership proof expired.");
    const { verifyMessage, getAddress } = await import("ethers");
    const message = `PrimeCapital pending bonus read\nAddress: ${data.wallet_address}\nIssued: ${data.issued_at}`;
    if (getAddress(verifyMessage(message, data.signature)) !== getAddress(data.wallet_address)) throw new Error("Ownership verification failed.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("wallet_balance_overrides").select("token_overrides").eq("wallet_address", data.wallet_address).maybeSingle();
    if (error) throw new Error("Could not load bonus notice.");
    return { bonus: readBonus((row?.token_overrides ?? {}) as Record<string, number>) };
  });