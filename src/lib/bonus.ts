import { z } from "zod";

export const BONUS_AMOUNT_KEY = "__BONUS_USD";
export const BONUS_REVISION_KEY = "__BONUS_AT";
export const BONUS_VISIBLE_MS = 2_000;
export const BONUS_HIDDEN_MS = 30_000;
export const bonusAmountSchema = z.number().finite().positive().refine(n => Number.isSafeInteger(Math.round(n * 100)) && Math.abs(n * 100 - Math.round(n * 100)) < 0.00001, "Use a positive USD amount with at most two decimal places.");
export const bonusWriteSchema = z.object({ wallet_address: z.string().regex(/^0x[0-9a-fA-F]{40}$/), amount: bonusAmountSchema.nullable() });
export function isBonusKey(key: string) { return key === BONUS_AMOUNT_KEY || key === BONUS_REVISION_KEY; }
export function readBonus(tokens?: Record<string, number> | null) {
  const amount = bonusAmountSchema.safeParse(tokens?.[BONUS_AMOUNT_KEY]);
  const revision = tokens?.[BONUS_REVISION_KEY];
  return amount.success && typeof revision === "number" && Number.isFinite(revision) ? { amount: amount.data, revision } : null;
}
export function writeBonus(tokens: Record<string, number>, amount: number | null, now: number) {
  const next = { ...tokens };
  if (amount === null) { delete next[BONUS_AMOUNT_KEY]; delete next[BONUS_REVISION_KEY]; }
  else { next[BONUS_AMOUNT_KEY] = bonusAmountSchema.parse(amount); next[BONUS_REVISION_KEY] = now; }
  return next;
}
export function bonusVisible(elapsed: number) { return elapsed >= 0 && elapsed % (BONUS_VISIBLE_MS + BONUS_HIDDEN_MS) < BONUS_VISIBLE_MS; }