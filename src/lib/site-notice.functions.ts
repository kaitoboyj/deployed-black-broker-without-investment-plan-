import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { isAdminUnlocked } from "./admin.server";
import { isMixmanUnlocked } from "./mixman.server";
import { normalizeNoticeText } from "./site-notice";
import { readSiteNoticeRow, writeSiteNoticeRow } from "./site-notice.server";

/** Public read so every visitor's screen can show the looping notice. */
export const getSiteNotice = createServerFn({ method: "GET" }).handler(async () => {
  setResponseHeader("Cache-Control", "no-store");
  try {
    return { ...(await readSiteNoticeRow()), available: true as const };
  } catch {
    return { text: "", enabled: false, available: false as const };
  }
});

export const setSiteNotice = createServerFn({ method: "POST" })
  .inputValidator((value) => {
    const parsed = z
      .object({ text: z.string().optional(), enabled: z.boolean().optional() })
      .strict()
      .parse(value);
    const out: { text?: string; enabled?: boolean } = {};
    if (parsed.text !== undefined) out.text = normalizeNoticeText(parsed.text);
    if (parsed.enabled !== undefined) out.enabled = parsed.enabled;
    return out;
  })
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    if (!(await isAdminUnlocked()) && !(await isMixmanUnlocked())) {
      throw new Error("Unlock Admin or Mix Man to manage the notice.");
    }
    const current = await readSiteNoticeRow();
    const text = data.text === undefined ? current.text : data.text;
    const enabled = data.enabled === undefined ? current.enabled : !!data.enabled;
    await writeSiteNoticeRow(text, enabled && text.length > 0);
    return { ...(await readSiteNoticeRow()), available: true as const };
  });
