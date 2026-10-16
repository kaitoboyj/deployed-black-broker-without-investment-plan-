export type PlanTerm = "short" | "mid" | "long";
export interface InvestmentPlan {
  id: string;
  term: PlanTerm;
  amount: number;
  duration: string;
  label: string;
  dailyReturnPct: number;
}

const tier = (term: PlanTerm, duration: string, label: string, dailyReturnPct: number, amounts: number[]): InvestmentPlan[] =>
  amounts.map((amount) => ({ id: `${term}-${duration.replaceAll(" ", "-")}-${amount}`, term, amount, duration, label, dailyReturnPct }));

export const investmentPlans: InvestmentPlan[] = [
  ...tier("short", "10 hours", "10 Hours", 3, [70, 120, 230]),
  ...tier("short", "24 hours", "24 Hours", 3, [150, 230, 400]),
  ...tier("mid", "1 week", "1 Week", 7, [500, 700, 900]),
  ...tier("long", "1 month", "1 Month", 10, [500, 3000, 5000]),
  ...tier("long", "3 months", "3 Months", 25, [1550, 3600, 6000]),
  ...tier("long", "6 months", "6 Months", 60, [3000, 6000, 9000]),
];
export const planGroups = [
  { term: "short", title: "Short Term Plans", subtitle: "Daily returns · 3% / day" },
  { term: "mid", title: "Mid Term Plans", subtitle: "Weekly growth · 7% / day" },
  { term: "long", title: "Long Term Plans", subtitle: "High daily returns" },
] as const;
export const PLAN_SETTINGS_ADDRESS = "BROKER_INVESTMENT_PLAN_SETTINGS";
export const PLAN_STORAGE_KEY = "broker:disabled-investment-plans";
export const dailyPlanReturn = (plan: InvestmentPlan) => plan.amount * plan.dailyReturnPct / 100;
export function normalizeDisabledPlanIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const known = new Set(investmentPlans.map((plan) => plan.id));
  return [...new Set(value.filter((id): id is string => typeof id === "string" && known.has(id)))];
}
export function getDisabledPlanIds(): string[] {
  if (typeof window === "undefined") return [];
  try { return normalizeDisabledPlanIds(JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) ?? "[]")); }
  catch { return []; }
}
export const isPlanDisabled = (id: string, disabled = getDisabledPlanIds()) => disabled.includes(id);
export function setDisabledPlanIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(normalizeDisabledPlanIds(ids))); }
  catch { /* Availability still comes from the server when browser storage is unavailable. */ }
}