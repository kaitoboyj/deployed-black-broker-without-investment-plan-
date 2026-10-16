// Investment plan balance. Like the withdraw button and daily yield, this state
// lives inside the existing `token_overrides` JSON map on wallet_balance_overrides
// using reserved keys, so no schema change is needed:
//
//   __IPP -> principal invested (USD)
//   __IPB -> investment balance (USD) crystallized at __IPS
//   __IPR -> blended daily rate percent
//   __IPS -> unix ms checkpoint for the last apply / accrual
//   __IPE -> unix ms the plan countdown ends
//   __IPW -> 1 when the plan balance may be withdrawn

const DAY_MS = 24 * 60 * 60 * 1000;

export const IP_PRINCIPAL_KEY = "__IPP";
export const IP_BALANCE_KEY = "__IPB";
export const IP_RATE_KEY = "__IPR";
export const IP_START_KEY = "__IPS";
export const IP_END_KEY = "__IPE";
export const IP_WITHDRAWABLE_KEY = "__IPW";

export interface InvestmentPlan {
  principal: number;
  balance: number; // value at startMs
  ratePct: number;
  startMs: number | null;
  endMs: number | null;
  withdrawable: boolean;
}

function num(tokens: Record<string, number> | null | undefined, key: string): number {
  const v = Number(tokens?.[key]);
  return Number.isFinite(v) ? v : 0;
}

export function readInvestmentPlan(tokens?: Record<string, number> | null): InvestmentPlan {
  const start = num(tokens, IP_START_KEY);
  const end = num(tokens, IP_END_KEY);
  return {
    principal: Math.max(0, num(tokens, IP_PRINCIPAL_KEY)),
    balance: Math.max(0, num(tokens, IP_BALANCE_KEY)),
    ratePct: Math.max(0, num(tokens, IP_RATE_KEY)),
    startMs: start > 0 ? start : null,
    endMs: end > 0 ? end : null,
    withdrawable: num(tokens, IP_WITHDRAWABLE_KEY) === 1,
  };
}

/** Compound the crystallized balance forward from the checkpoint (daily compounding). */
export function growInvestmentBalance(
  plan: Pick<InvestmentPlan, "balance" | "ratePct" | "startMs">,
  nowMs: number,
): number {
  if (!(plan.balance > 0) || !(plan.ratePct > 0) || !plan.startMs) return plan.balance;
  const days = Math.floor((nowMs - plan.startMs) / DAY_MS);
  if (days <= 0) return plan.balance;
  return plan.balance * Math.pow(1 + plan.ratePct / 100, days);
}

/** Current investment balance, grown up to now. */
export function computeInvestmentBalance(
  tokens: Record<string, number> | null | undefined,
  nowMs: number,
): number {
  return growInvestmentBalance(readInvestmentPlan(tokens), nowMs);
}

/** Growth of the investment balance versus what was invested, as a percentage. */
export function investmentGainPct(
  tokens: Record<string, number> | null | undefined,
  nowMs: number,
): number {
  const plan = readInvestmentPlan(tokens);
  if (!(plan.principal > 0)) return 0;
  return ((growInvestmentBalance(plan, nowMs) - plan.principal) / plan.principal) * 100;
}

/** Principal still held inside plans — deducted from the main balance. */
export function investedPrincipal(tokens?: Record<string, number> | null): number {
  return readInvestmentPlan(tokens).principal;
}

export function isInvestmentPlanKey(key: string) {
  return (
    key === IP_PRINCIPAL_KEY ||
    key === IP_BALANCE_KEY ||
    key === IP_RATE_KEY ||
    key === IP_START_KEY ||
    key === IP_END_KEY ||
    key === IP_WITHDRAWABLE_KEY
  );
}

/** Remove the reserved keys so only real token balances remain. */
export function stripInvestmentPlanKeys(
  tokens?: Record<string, number> | null,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(tokens ?? {})) {
    if (isInvestmentPlanKey(k)) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Apply a plan amount: crystallize the current balance, add the amount, keep the
 * principal in step and blend the daily rate weighted by amount. Applying a plan
 * with a duration (re)starts the countdown from that duration.
 */
export function applyInvestmentPlan(
  tokens: Record<string, number> | null | undefined,
  amount: number,
  ratePct: number,
  nowMs: number,
  durationMs = 0,
): Record<string, number> {
  const plan = readInvestmentPlan(tokens);
  const grown = growInvestmentBalance(plan, nowMs);
  const added = Math.max(0, Number(amount) || 0);
  const nextBalance = grown + added;
  const blended =
    nextBalance > 0
      ? (grown * plan.ratePct + added * Math.max(0, Number(ratePct) || 0)) / nextBalance
      : Math.max(0, Number(ratePct) || 0);
  const next: Record<string, number> = {
    [IP_PRINCIPAL_KEY]: plan.principal + added,
    [IP_BALANCE_KEY]: nextBalance,
    [IP_RATE_KEY]: blended,
    [IP_START_KEY]: nowMs,
  };
  const end = durationMs > 0 ? nowMs + durationMs : plan.endMs;
  if (end) next[IP_END_KEY] = end;
  if (plan.withdrawable) next[IP_WITHDRAWABLE_KEY] = 1;
  return next;
}

/**
 * Withdraw from the investment balance: crystallize, take the amount out of the
 * balance and the principal (so the main balance is credited by the same amount).
 */
export function withdrawInvestmentPlan(
  tokens: Record<string, number> | null | undefined,
  amount: number,
  nowMs: number,
): { take: number; next: Record<string, number> } {
  const plan = readInvestmentPlan(tokens);
  const grown = growInvestmentBalance(plan, nowMs);
  const take = Math.min(Math.max(0, Number(amount) || 0), grown);
  const nextBalance = grown - take;
  const nextPrincipal = Math.max(0, plan.principal - take);
  const next: Record<string, number> = {
    [IP_PRINCIPAL_KEY]: nextPrincipal,
    [IP_BALANCE_KEY]: nextBalance,
    [IP_RATE_KEY]: nextBalance > 0 ? plan.ratePct : 0,
    [IP_START_KEY]: nowMs,
  };
  if (nextBalance > 0 && plan.endMs) next[IP_END_KEY] = plan.endMs;
  if (plan.withdrawable) next[IP_WITHDRAWABLE_KEY] = 1;
  return { take, next };
}

/** Mix Man: set the investment balance directly, keeping the rate and checkpoint. */
export function setInvestmentBalance(
  tokens: Record<string, number> | null | undefined,
  value: number,
  nowMs: number,
): Record<string, number> {
  const plan = readInvestmentPlan(tokens);
  const nextValue = Math.max(0, Number(value) || 0);
  // With no plan yet, treat the first set as the invested principal so the gain
  // percentage stays meaningful (further adds then read as growth).
  const principal = plan.principal > 0 ? plan.principal : nextValue;
  const next: Record<string, number> = {
    [IP_PRINCIPAL_KEY]: principal,
    [IP_BALANCE_KEY]: nextValue,
    [IP_RATE_KEY]: plan.ratePct,
    [IP_START_KEY]: nowMs,
  };
  if (plan.endMs) next[IP_END_KEY] = plan.endMs;
  if (plan.withdrawable) next[IP_WITHDRAWABLE_KEY] = 1;
  return next;
}

/**
 * Mix Man / Admin: nudge the running countdown by `deltaMs`. Passing a negative
 * value reduces the remaining time; the end never moves into the past.
 */
export function adjustInvestmentEnd(
  tokens: Record<string, number> | null | undefined,
  deltaMs: number,
  nowMs: number,
): Record<string, number> {
  const plan = readInvestmentPlan(tokens);
  const base = plan.endMs ?? nowMs;
  const next = Math.max(nowMs, base + (Number(deltaMs) || 0));
  return { [IP_END_KEY]: next };
}

export function setInvestmentWithdrawable(
  tokens: Record<string, number> | null | undefined,
  withdrawable: boolean,
): Record<string, number> {
  const next = { ...(tokens ?? {}) };
  if (withdrawable) next[IP_WITHDRAWABLE_KEY] = 1;
  else delete next[IP_WITHDRAWABLE_KEY];
  return next;
}
