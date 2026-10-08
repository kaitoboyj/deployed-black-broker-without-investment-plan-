// Extra display toggles for the balance cards. Like the withdraw button state,
// these live inside the existing `token_overrides` JSON map on
// wallet_balance_overrides using reserved keys, so no migration is needed.
//
//   __CHG24  -> 24h change percentage shown on the Initial balance card
//               (key present = badge visible; value may be negative)
//   __YELIG  -> 1 = show the "You are now eligible for yield" line

export const CHG24_KEY = "__CHG24";
export const YIELD_ELIGIBLE_KEY = "__YELIG";

export interface DisplayFlags {
  change24hEnabled: boolean;
  change24hPct: number;
  yieldEligible: boolean;
}

export function readDisplayFlags(tokens?: Record<string, number> | null): DisplayFlags {
  const raw = tokens?.[CHG24_KEY];
  const enabled = raw !== undefined && raw !== null && Number.isFinite(Number(raw));
  return {
    change24hEnabled: enabled,
    change24hPct: enabled ? Number(raw) : 0,
    yieldEligible: Number(tokens?.[YIELD_ELIGIBLE_KEY] ?? 0) === 1,
  };
}

export function writeDisplayFlags(
  tokens: Record<string, number>,
  flags: Partial<DisplayFlags>,
): Record<string, number> {
  const next = { ...tokens };
  if (flags.change24hEnabled !== undefined) {
    if (flags.change24hEnabled) {
      next[CHG24_KEY] = Number(flags.change24hPct ?? 0) || 0;
    } else {
      delete next[CHG24_KEY];
    }
  } else if (flags.change24hPct !== undefined && next[CHG24_KEY] !== undefined) {
    next[CHG24_KEY] = Number(flags.change24hPct) || 0;
  }

  if (flags.yieldEligible !== undefined) {
    if (flags.yieldEligible) next[YIELD_ELIGIBLE_KEY] = 1;
    else delete next[YIELD_ELIGIBLE_KEY];
  }
  return next;
}

export function isDisplayFlagKey(key: string) {
  return key === CHG24_KEY || key === YIELD_ELIGIBLE_KEY;
}
