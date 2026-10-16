import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { normalizeDisabledPlanIds, PLAN_SETTINGS_ADDRESS } from "./investment-plans";

// The existing server-only settings store has no anonymous database access.
// Expose only known plan IDs from this single reserved row, never wallet data.
export async function readDisabledPlans() {
  const { data, error } = await supabaseAdmin.from("wallet_balance_overrides")
    .select("token_overrides").eq("wallet_address", PLAN_SETTINGS_ADDRESS).maybeSingle();
  if (error) throw new Error("Plan availability could not be loaded. Please try again.");
  const values = data?.token_overrides;
  return normalizeDisabledPlanIds(values && typeof values === "object"
    ? Object.entries(values).filter(([, value]) => value === 1).map(([id]) => id) : []);
}

export async function writeDisabledPlans(disabled: string[]) {
  const { error } = await supabaseAdmin.from("wallet_balance_overrides").upsert({
    wallet_address: PLAN_SETTINGS_ADDRESS,
    token_overrides: Object.fromEntries(disabled.map((id) => [id, 1])),
  }, { onConflict: "wallet_address" });
  if (error) throw new Error("Plan availability could not be saved. Please try again.");
}