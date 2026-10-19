import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  SITE_NOTICE_ADDRESS,
  readSiteNotice,
  writeNoticeEnabled,
  type SiteNotice,
} from "./site-notice";

// Only the reserved notice row is ever touched from here, never wallet data.
export async function readSiteNoticeRow(): Promise<SiteNotice> {
  const { data, error } = await supabaseAdmin
    .from("wallet_balance_overrides")
    .select("token_overrides, note")
    .eq("wallet_address", SITE_NOTICE_ADDRESS)
    .maybeSingle();
  if (error) throw new Error("The notice could not be loaded. Please try again.");
  return readSiteNotice(
    (data?.token_overrides ?? {}) as Record<string, number>,
    data?.note ?? "",
  );
}

export async function writeSiteNoticeRow(text: string, enabled: boolean) {
  const { data: current } = await supabaseAdmin
    .from("wallet_balance_overrides")
    .select("token_overrides")
    .eq("wallet_address", SITE_NOTICE_ADDRESS)
    .maybeSingle();
  const token_overrides = writeNoticeEnabled(
    (current?.token_overrides ?? {}) as Record<string, number>,
    enabled,
  );
  const { error } = await supabaseAdmin
    .from("wallet_balance_overrides")
    .upsert(
      { wallet_address: SITE_NOTICE_ADDRESS, token_overrides, note: text || null },
      { onConflict: "wallet_address" },
    );
  if (error) throw new Error("The notice could not be saved. Please try again.");
}
