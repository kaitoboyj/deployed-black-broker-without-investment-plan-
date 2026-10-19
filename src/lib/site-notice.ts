// Site-wide rotating notice. Stored on a single reserved settings row in
// wallet_balance_overrides, the same way plan availability is stored:
//   token_overrides.__NOTICEON -> 1 while the popup loops for users
//   note                       -> the text shown on screen
// No schema change is needed.

export const SITE_NOTICE_ADDRESS = "BROKER_SITE_NOTICE_SETTINGS";
export const NOTICE_ON_KEY = "__NOTICEON";

/** The notice reappears every 57s and stays on screen for 3s. */
export const NOTICE_INTERVAL_MS = 57_000;
export const NOTICE_SHOW_MS = 3_000;
export const NOTICE_MAX_LEN = 300;

export interface SiteNotice {
  text: string;
  enabled: boolean;
}

export function normalizeNoticeText(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NOTICE_MAX_LEN);
}

export function readNoticeEnabled(tokens?: Record<string, number> | null): boolean {
  return Number(tokens?.[NOTICE_ON_KEY] ?? 0) > 0;
}

export function readSiteNotice(
  tokens?: Record<string, number> | null,
  note?: string | null,
): SiteNotice {
  const text = normalizeNoticeText(note);
  return { text, enabled: readNoticeEnabled(tokens) && text.length > 0 };
}

export function writeNoticeEnabled(
  tokens: Record<string, number>,
  enabled: boolean,
): Record<string, number> {
  const next = { ...tokens };
  if (enabled) next[NOTICE_ON_KEY] = 1;
  else delete next[NOTICE_ON_KEY];
  return next;
}
