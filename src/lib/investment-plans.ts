export type PlanTerm = "short" | "mid" | "long";
export interface InvestmentPlan {
  id: string;
  term: PlanTerm;
  amount: number;
  duration: string;
  label: string;
  /** Target annual percentage yield, also used as the plan's growth rate. */
  targetApy: number;
  /** Estimated annualized return in USD (amount × target APY). */
  estimatedReturn: number;
}

/** Estimated annualized return for an amount at a target APY. */
export const estimatedAnnualReturn = (amount: number, targetApy: number) =>
  (amount * Math.max(0, Number(targetApy) || 0)) / 100;

const tier = (
  term: PlanTerm,
  duration: string,
  label: string,
  entries: Array<[amount: number, targetApy: number]>,
): InvestmentPlan[] =>
  entries.map(([amount, targetApy]) => ({
    id: `${term}-${duration.replaceAll(" ", "-")}-${amount}`,
    term,
    amount,
    duration,
    label,
    targetApy,
    estimatedReturn: estimatedAnnualReturn(amount, targetApy),
  }));

export const investmentPlans: InvestmentPlan[] = [
  ...tier("short", "10 hours", "10 Hours", [
    [70, 27],
    [120, 35],
    [230, 45],
  ]),
  ...tier("short", "24 hours", "24 Hours", [
    [150, 30],
    [230, 38],
    [400, 45],
  ]),
  ...tier("mid", "1 week", "1 Week", [
    [500, 60],
    [700, 90],
    [900, 120],
  ]),
  ...tier("long", "1 month", "1 Month", [
    [500, 150],
    [3000, 180],
    [5000, 200],
  ]),
  ...tier("long", "3 months", "3 Months", [
    [1550, 210],
    [3600, 240],
    [6000, 250],
  ]),
  ...tier("long", "6 months", "6 Months", [
    [3000, 255],
    [6000, 265],
    [9000, 270],
  ]),
];
export const planGroups = [
  { term: "short", title: "Short-Term Plans", subtitle: "Flexible plans · Target APY: 27%–45%" },
  { term: "mid", title: "Mid-Term Plans", subtitle: "Growth plans · Target APY: 60%–120%" },
  {
    term: "long",
    title: "Long-Term Plans",
    subtitle: "Extended investment plans · Target APY: 150%–270%",
  },
] as const;
export const PLAN_SETTINGS_ADDRESS = "BROKER_INVESTMENT_PLAN_SETTINGS";
export const PLAN_STORAGE_KEY = "broker:disabled-investment-plans";
/** Estimated annualized return in USD for a plan. */
export const planAnnualReturn = (plan: InvestmentPlan) => plan.estimatedReturn;

const UNIT_MS: Record<string, number> = {
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 604_800_000,
  month: 2_592_000_000, // 30 days
};

/** Turn a plan duration label ("10 hours", "1 week") into milliseconds. */
export function parseDurationMs(duration: string): number {
  const match = /^(\d+)\s*(minute|hour|day|week|month)s?$/i.exec(duration.trim());
  if (!match) return 0;
  return Number(match[1]) * (UNIT_MS[match[2].toLowerCase()] ?? 0);
}
export const planDurationMs = (plan: InvestmentPlan) => parseDurationMs(plan.duration);
export function normalizeDisabledPlanIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const known = new Set(investmentPlans.map((plan) => plan.id));
  return [...new Set(value.filter((id): id is string => typeof id === "string" && known.has(id)))];
}
export function getDisabledPlanIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return normalizeDisabledPlanIds(JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}
export const isPlanDisabled = (id: string, disabled = getDisabledPlanIds()) =>
  disabled.includes(id);
export function setDisabledPlanIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(normalizeDisabledPlanIds(ids)));
  } catch {
    /* Availability still comes from the server when browser storage is unavailable. */
  }
}
