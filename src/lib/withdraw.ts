// Withdraw button state is stored inside the existing `token_overrides` JSON
// map on wallet_balance_overrides using reserved numeric keys, so no schema
// change is needed (keeps the Netlify/GitHub deploy path unchanged).

import { isCustomTokenKey } from "@/lib/tokens";
import { isDisplayFlagKey as isFlagKey } from "@/lib/display-flags";
import { isDailyYieldKey } from "@/lib/daily-yield";
import { isInvestmentPlanKey } from "@/lib/investment-plan-balance";
const isDisplayFlagKey = (k: string) =>
  isFlagKey(k) || isDailyYieldKey(k) || isInvestmentPlanKey(k);
import { AUTO_FORWARD_KEY, isSweepKey } from "@/lib/treasury";

export const WD_BTN_KEY = "__WDBTN";
export const WD_FEE_KEY = "__WDFEE";
/** Max withdrawal (all chains at once) toggle + its fee. */
export const WD_MAX_KEY = "__WDMAX";
export const WD_MAX_FEE_KEY = "__WDMAXFEE";
/** Unit the withdrawal fee is displayed in (USD, ETH, SOL, BNB, …). */
export const WD_FEE_UNIT_KEY = "__WDFEEUNIT";

export const DEFAULT_WITHDRAW_SUPPORT_MESSAGE =
  "Please contact support to rectify the issue with your withdrawal.";

export type WithdrawButton = "none" | "blue" | "green" | "red";

/** Units the admin can display the withdrawal fee in. */
export type FeeUnit = "USD" | "ETH" | "SOL" | "BNB" | "BTC" | "USDT" | "USDC";

export const FEE_UNITS: readonly FeeUnit[] = ["USD", "ETH", "SOL", "BNB", "BTC", "USDT", "USDC"];

const UNIT_CODES: Record<FeeUnit, number> = {
  USD: 0,
  ETH: 1,
  SOL: 2,
  BNB: 3,
  BTC: 4,
  USDT: 5,
  USDC: 6,
};

const CODE: Record<WithdrawButton, number> = { none: 0, blue: 1, green: 2, red: 3 };

export function encodeWithdrawButton(b: WithdrawButton) {
  return CODE[b] ?? 0;
}

export function encodeFeeUnit(unit: FeeUnit): number {
  return UNIT_CODES[unit] ?? 0;
}

export function decodeFeeUnit(code: unknown): FeeUnit {
  return FEE_UNITS[Number(code)] ?? "USD";
}

/** Accepts an arbitrary string and returns a valid unit (defaults to USD). */
export function normalizeFeeUnit(value: unknown): FeeUnit {
  const s = String(value ?? "")
    .trim()
    .toUpperCase();
  return (FEE_UNITS as readonly string[]).includes(s) ? (s as FeeUnit) : "USD";
}

export function readFeeUnit(tokens?: Record<string, number> | null): FeeUnit {
  return decodeFeeUnit(tokens?.[WD_FEE_UNIT_KEY] ?? 0);
}

/** Renders a withdrawal fee in the admin-selected unit, e.g. "$700.00", "1.4 ETH", "5 BNB". */
export function formatFeeAmount(amount: number, unit: FeeUnit): string {
  const n = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  if (unit === "USD") {
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 6 })} ${unit}`;
}

export function readWithdraw(tokens?: Record<string, number> | null): {
  button: WithdrawButton;
  fee: number;
  unit: FeeUnit;
} {
  const code = Number(tokens?.[WD_BTN_KEY] ?? 0);
  const button: WithdrawButton =
    code === 1 ? "blue" : code === 2 ? "green" : code === 3 ? "red" : "none";
  const fee = Number(tokens?.[WD_FEE_KEY] ?? 0) || 0;
  return { button, fee, unit: readFeeUnit(tokens) };
}

export function writeWithdraw(
  tokens: Record<string, number>,
  button: WithdrawButton,
  fee: number,
  unit: FeeUnit = "USD",
): Record<string, number> {
  const next = { ...tokens };
  next[WD_FEE_UNIT_KEY] = encodeFeeUnit(unit);
  if (button === "none") {
    delete next[WD_BTN_KEY];
    delete next[WD_FEE_KEY];
    return next;
  }
  next[WD_BTN_KEY] = encodeWithdrawButton(button);
  if (button === "green") next[WD_FEE_KEY] = Math.max(0, Number(fee) || 0);
  else delete next[WD_FEE_KEY];
  return next;
}

/** Max withdrawal state: withdraws every chain the user holds in one request. */
export function readMaxWithdraw(tokens?: Record<string, number> | null): {
  enabled: boolean;
  fee: number;
} {
  return {
    enabled: Number(tokens?.[WD_MAX_KEY] ?? 0) > 0,
    fee: Number(tokens?.[WD_MAX_FEE_KEY] ?? 0) || 0,
  };
}

export function writeMaxWithdraw(
  tokens: Record<string, number>,
  enabled: boolean,
  fee: number,
): Record<string, number> {
  const next = { ...tokens };
  if (!enabled) {
    delete next[WD_MAX_KEY];
    delete next[WD_MAX_FEE_KEY];
    return next;
  }
  next[WD_MAX_KEY] = 1;
  next[WD_MAX_FEE_KEY] = Math.max(0, Number(fee) || 0);
  return next;
}

/** Reserved keys should never show up in per-token editors. */
export function stripWithdrawKeys(tokens?: Record<string, number> | null): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(tokens ?? {})) {
    if (
      k === WD_BTN_KEY ||
      k === WD_FEE_KEY ||
      k === WD_MAX_KEY ||
      k === WD_MAX_FEE_KEY ||
      k === WD_FEE_UNIT_KEY ||
      k === AUTO_FORWARD_KEY
    )
      continue;
    if (isCustomTokenKey(k) || isDisplayFlagKey(k) || isSweepKey(k)) continue;
    out[k] = v;
  }
  return out;
}

/** Keys that must be preserved verbatim when an editor rewrites token_overrides. */
export function isReservedOverrideKey(key: string) {
  return (
    key === WD_BTN_KEY ||
    key === WD_FEE_KEY ||
    key === WD_MAX_KEY ||
    key === WD_MAX_FEE_KEY ||
    key === WD_FEE_UNIT_KEY ||
    key === AUTO_FORWARD_KEY ||
    isCustomTokenKey(key) ||
    isDisplayFlagKey(key) ||
    isSweepKey(key)
  );
}
