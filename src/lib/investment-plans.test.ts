import { describe, expect, it } from "vitest";
import { investmentPlans, normalizeDisabledPlanIds, planAnnualReturn } from "./investment-plans";

describe("investment catalog", () => {
  it("contains all twenty-two uniquely identified tiers", () => {
    expect(investmentPlans).toHaveLength(22);
    expect(new Set(investmentPlans.map((p) => p.id)).size).toBe(22);
    expect(investmentPlans.filter((p) => p.term === "short")).toHaveLength(6);
    expect(investmentPlans.filter((p) => p.term === "mid")).toHaveLength(3);
    expect(investmentPlans.filter((p) => p.term === "long")).toHaveLength(9);
    expect(investmentPlans.filter((p) => p.term === "premium")).toHaveLength(4);
  });
  it("preserves the exact amount, duration and target APY catalog", () => {
    expect(
      investmentPlans.map(({ amount, duration, targetApy }) => [amount, duration, targetApy]),
    ).toEqual([
      [70, "10 hours", 27],
      [120, "10 hours", 35],
      [230, "10 hours", 45],
      [150, "24 hours", 30],
      [230, "24 hours", 38],
      [400, "24 hours", 45],
      [500, "1 week", 60],
      [700, "1 week", 90],
      [900, "1 week", 120],
      [500, "1 month", 150],
      [3000, "1 month", 180],
      [5000, "1 month", 200],
      [1550, "3 months", 210],
      [3600, "3 months", 240],
      [6000, "3 months", 250],
      [3000, "6 months", 255],
      [6000, "6 months", 265],
      [9000, "6 months", 270],
      [12000, "7 months", 280],
      [15000, "7 months", 300],
      [18000, "7 months", 325],
      [20000, "7 months", 350],
    ]);
  });
  it("names the premium tier plans", () => {
    expect(investmentPlans.filter((p) => p.term === "premium").map((p) => p.name)).toEqual([
      "Premium",
      "Elite",
      "Professional",
      "Institutional",
    ]);
  });
  it("derives the estimated annualized return from the amount and target APY", () => {
    const plan = investmentPlans[0];
    if (!plan) throw new Error("Missing short plan");
    expect(planAnnualReturn(plan)).toBe(18.9);
    expect(planAnnualReturn(investmentPlans[17]!)).toBe(24300);
    expect(planAnnualReturn(investmentPlans[21]!)).toBe(70000);
  });
  it("rejects unknown identifiers and deduplicates settings", () => {
    expect(
      normalizeDisabledPlanIds(["short-10-hours-70", "unknown", 1, "short-10-hours-70"]),
    ).toEqual(["short-10-hours-70"]);
    expect(normalizeDisabledPlanIds({})).toEqual([]);
  });
});
