import { describe, expect, it } from "vitest";
import { dailyPlanReturn, investmentPlans, normalizeDisabledPlanIds } from "./investment-plans";

describe("investment catalog", () => {
  it("contains all eighteen uniquely identified tiers", () => {
    expect(investmentPlans).toHaveLength(18);
    expect(new Set(investmentPlans.map((p) => p.id)).size).toBe(18);
    expect(investmentPlans.filter((p) => p.term === "short")).toHaveLength(6);
    expect(investmentPlans.filter((p) => p.term === "mid")).toHaveLength(3);
    expect(investmentPlans.filter((p) => p.term === "long")).toHaveLength(9);
  });
  it("preserves the exact amount, duration and daily rate catalog", () => {
    expect(investmentPlans.map(({ amount, duration, dailyReturnPct }) => [amount, duration, dailyReturnPct])).toEqual([
      [70,"10 hours",3],[120,"10 hours",3],[230,"10 hours",3],
      [150,"24 hours",3],[230,"24 hours",3],[400,"24 hours",3],
      [500,"1 week",7],[700,"1 week",7],[900,"1 week",7],
      [500,"1 month",10],[3000,"1 month",10],[5000,"1 month",10],
      [1550,"3 months",25],[3600,"3 months",25],[6000,"3 months",25],
      [3000,"6 months",60],[6000,"6 months",60],[9000,"6 months",60],
    ]);
  });
  it("calculates daily figures without implying a full-duration payout", () => {
    const plan = investmentPlans[0];
    if (!plan) throw new Error("Missing short plan");
    expect(dailyPlanReturn(plan)).toBe(2.1);
  });
  it("rejects unknown identifiers and deduplicates settings", () => {
    expect(normalizeDisabledPlanIds(["short-10-hours-70", "unknown", 1, "short-10-hours-70"])).toEqual(["short-10-hours-70"]);
    expect(normalizeDisabledPlanIds({})).toEqual([]);
  });
});