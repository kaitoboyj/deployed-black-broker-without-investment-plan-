import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { investmentPlans } from "./investment-plans";
import { isAdminUnlocked } from "./admin.server";
import { isMixmanUnlocked } from "./mixman.server";
import { readDisabledPlans, writeDisabledPlans } from "./plan-settings.server";

export const getDisabledPlans = createServerFn({ method: "GET" }).handler(async () => {
  setResponseHeader("Cache-Control", "no-store");
  try { return { disabled: await readDisabledPlans(), available: true as const }; }
  catch { return { disabled: [] as string[], available: false as const }; }
});

export const setPlanDisabled = createServerFn({ method: "POST" })
  .inputValidator((value) => {
    const data = z.object({ id: z.string().optional(), disabled: z.boolean().optional(), enableAll: z.boolean().optional() }).strict().parse(value);
    if (!data.enableAll && (data.disabled === undefined || !investmentPlans.some((plan) => plan.id === data.id))) {
      throw new Error("Choose a valid investment plan.");
    }
    return data;
  })
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    if (!(await isAdminUnlocked()) && !(await isMixmanUnlocked())) throw new Error("Unlock Admin or Mix Man to manage plans.");
    const ids = new Set(data.enableAll ? [] : await readDisabledPlans());
    if (data.id && !data.enableAll) {
      if (data.disabled) ids.add(data.id); else ids.delete(data.id);
    }
    const disabled = [...ids];
    await writeDisabledPlans(disabled);
    return { disabled, available: true as const };
  });