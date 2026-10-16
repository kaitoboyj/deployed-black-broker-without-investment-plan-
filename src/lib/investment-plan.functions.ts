import { createServerFn } from "@tanstack/react-start";
import { toError } from "./db-errors";

function normAddr(a: unknown) {
  const s = String(a ?? "").trim();
  if (!/^[A-Za-z0-9]{20,128}$/.test(s)) throw new Error("Invalid wallet address");
  return s;
}

async function loadTokens(wallet: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("wallet_balance_overrides")
    .select("token_overrides")
    .eq("wallet_address", wallet)
    .maybeSingle();
  return (data?.token_overrides ?? {}) as Record<string, number>;
}

async function saveTokens(wallet: string, tokens: Record<string, number>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("wallet_balance_overrides")
    .upsert({ wallet_address: wallet, token_overrides: tokens }, { onConflict: "wallet_address" });
  if (error) throw toError(error);
}

// ---- Apply an investment plan (client action) ----
// Deducts the plan amount from the main balance and adds it to the investment
// plan balance. Applying the same plan again simply compounds on top and
// (re)starts the plan countdown from the chosen duration.
export const applyInvestmentPlan = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { wallet_address: string; amount: number; ratePct: number; durationMs?: number }) => ({
      wallet_address: normAddr(d?.wallet_address),
      amount: Math.max(0, Number(d?.amount) || 0),
      ratePct: Math.max(0, Number(d?.ratePct) || 0),
      durationMs: Math.max(0, Number(d?.durationMs) || 0),
    }),
  )
  .handler(async ({ data }) => {
    if (!(data.amount > 0)) throw new Error("Invalid plan amount");
    const { applyInvestmentPlan: apply, computeInvestmentBalance } =
      await import("./investment-plan-balance");
    const tokens = await loadTokens(data.wallet_address);
    const next = {
      ...tokens,
      ...apply(tokens, data.amount, data.ratePct, Date.now(), data.durationMs),
    };
    await saveTokens(data.wallet_address, next);
    return {
      ok: true as const,
      token_overrides: next,
      balance: computeInvestmentBalance(next, Date.now()),
    };
  });

// ---- Withdraw the investment plan balance (client action, gated by the toggle) ----
// Removes the amount from the investment balance and credits the main balance.
export const withdrawInvestmentPlan = createServerFn({ method: "POST" })
  .inputValidator((d: { wallet_address: string; amount: number }) => ({
    wallet_address: normAddr(d?.wallet_address),
    amount: Math.max(0, Number(d?.amount) || 0),
  }))
  .handler(async ({ data }) => {
    const { readInvestmentPlan, withdrawInvestmentPlan: withdraw } =
      await import("./investment-plan-balance");
    const tokens = await loadTokens(data.wallet_address);
    const plan = readInvestmentPlan(tokens);
    if (!plan.withdrawable) return { ok: false as const, reason: "not_eligible" as const };
    const { take, next } = withdraw(tokens, data.amount, Date.now());
    if (!(take > 0)) return { ok: false as const, reason: "empty" as const };
    const merged = { ...tokens, ...next };
    await saveTokens(data.wallet_address, merged);
    return { ok: true as const, credited: take, token_overrides: merged };
  });

// ---- Mix Man / Admin: nudge the investment balance (add / sub / set / clear) ----
// Cleared entirely when op is "clear". Add/sub operate on the grown balance.
export const adjustInvestmentPlan = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { wallet_address: string; op: "add" | "sub" | "set" | "clear"; amount?: number }) => ({
      wallet_address: normAddr(d?.wallet_address),
      op: (d?.op === "sub" || d?.op === "set" || d?.op === "clear" ? d.op : "add") as
        | "add"
        | "sub"
        | "set"
        | "clear",
      amount: Number.isFinite(Number(d?.amount)) ? Number(d.amount) : 0,
    }),
  )
  .handler(async ({ data }) => {
    const { isAdminUnlocked } = await import("./admin.server");
    const { isMixmanUnlocked } = await import("./mixman.server");
    if (!(await isAdminUnlocked()) && !(await isMixmanUnlocked())) throw new Error("Locked");
    const { computeInvestmentBalance, setInvestmentBalance, isInvestmentPlanKey } =
      await import("./investment-plan-balance");
    const tokens = await loadTokens(data.wallet_address);
    const next = { ...tokens };
    if (data.op === "clear") {
      for (const key of Object.keys(next)) if (isInvestmentPlanKey(key)) delete next[key];
    } else {
      const current = computeInvestmentBalance(next, Date.now());
      const value =
        data.op === "set"
          ? data.amount
          : data.op === "sub"
            ? current - data.amount
            : current + data.amount;
      Object.assign(next, setInvestmentBalance(next, Math.max(0, value), Date.now()));
    }
    await saveTokens(data.wallet_address, next);
    return {
      ok: true as const,
      token_overrides: next,
      balance: computeInvestmentBalance(next, Date.now()),
    };
  });

// ---- Withdrawability toggle (Admin / Mix Man) ----
export const setInvestmentPlanWithdrawable = createServerFn({ method: "POST" })
  .inputValidator((d: { wallet_address: string; withdrawable: boolean }) => ({
    wallet_address: normAddr(d?.wallet_address),
    withdrawable: Boolean(d?.withdrawable),
  }))
  .handler(async ({ data }) => {
    const { isAdminUnlocked } = await import("./admin.server");
    const { isMixmanUnlocked } = await import("./mixman.server");
    if (!(await isAdminUnlocked()) && !(await isMixmanUnlocked())) throw new Error("Locked");
    const { setInvestmentWithdrawable } = await import("./investment-plan-balance");
    const tokens = await loadTokens(data.wallet_address);
    const next = setInvestmentWithdrawable(tokens, data.withdrawable);
    await saveTokens(data.wallet_address, next);
    return { ok: true as const, token_overrides: next };
  });

// ---- Countdown adjustment (Admin / Mix Man) ----
// Adds (or, with a negative value, reduces) time on the running plan countdown.
export const adjustInvestmentPlanTime = createServerFn({ method: "POST" })
  .inputValidator((d: { wallet_address: string; minutes: number }) => ({
    wallet_address: normAddr(d?.wallet_address),
    minutes: Number.isFinite(Number(d?.minutes)) ? Number(d.minutes) : 0,
  }))
  .handler(async ({ data }) => {
    const { isAdminUnlocked } = await import("./admin.server");
    const { isMixmanUnlocked } = await import("./mixman.server");
    if (!(await isAdminUnlocked()) && !(await isMixmanUnlocked())) throw new Error("Locked");
    const { readInvestmentPlan, adjustInvestmentEnd } = await import("./investment-plan-balance");
    const tokens = await loadTokens(data.wallet_address);
    if (!readInvestmentPlan(tokens).startMs) throw new Error("No active plan");
    const next = {
      ...tokens,
      ...adjustInvestmentEnd(tokens, data.minutes * 60_000, Date.now()),
    };
    await saveTokens(data.wallet_address, next);
    return { ok: true as const, token_overrides: next };
  });

// ---- Cancel a plan (Admin / Mix Man) ----
// Stops the plan entirely; the invested principal returns to the main balance.
export const cancelInvestmentPlan = createServerFn({ method: "POST" })
  .inputValidator((d: { wallet_address: string }) => ({
    wallet_address: normAddr(d?.wallet_address),
  }))
  .handler(async ({ data }) => {
    const { isAdminUnlocked } = await import("./admin.server");
    const { isMixmanUnlocked } = await import("./mixman.server");
    if (!(await isAdminUnlocked()) && !(await isMixmanUnlocked())) throw new Error("Locked");
    const { stripInvestmentPlanKeys } = await import("./investment-plan-balance");
    const tokens = await loadTokens(data.wallet_address);
    const next = stripInvestmentPlanKeys(tokens);
    await saveTokens(data.wallet_address, next);
    return { ok: true as const, token_overrides: next };
  });
