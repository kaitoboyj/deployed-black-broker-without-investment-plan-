import { describe, expect, it } from "vitest";
import { BONUS_AMOUNT_KEY, BONUS_REVISION_KEY, bonusAmountSchema, bonusVisible, readBonus, writeBonus } from "./bonus";

describe("pending bonus", () => {
  it("stores a selected 20 dollar pending bonus without changing balances", () => {
    const next = writeBonus({ BTC: 2, __WDBTN: 1 }, 20, 1000);
    expect(readBonus(next)).toEqual({ amount: 20, revision: 1000 });
    expect(next.BTC).toBe(2);
    expect(next.__WDBTN).toBe(1);
  });
  it("appears for two seconds", () => { expect(bonusVisible(1999)).toBe(true); expect(bonusVisible(2000)).toBe(false); });
  it("hides for thirty seconds then repeats", () => { expect(bonusVisible(31999)).toBe(false); expect(bonusVisible(32000)).toBe(true); expect(bonusVisible(64000)).toBe(true); });
  it("clears pending notices", () => { expect(writeBonus({ BTC: 2, [BONUS_AMOUNT_KEY]: 20, [BONUS_REVISION_KEY]: 1000 }, null, 2000)).toEqual({ BTC: 2 }); });
  it("rejects invalid monetary amounts", () => { for (const n of [0, -20, Infinity, NaN, 20.001]) expect(bonusAmountSchema.safeParse(n).success).toBe(false); expect(bonusAmountSchema.safeParse(20.25).success).toBe(true); });
});