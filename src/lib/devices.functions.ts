import { createServerFn } from "@tanstack/react-start";

export interface WalletDeviceRow {
  id: string;
  wallet_address: string;
  device_id: string;
  username: string | null;
  device_name: string | null;
  os: string | null;
  browser: string | null;
  browser_version: string | null;
  screen: string | null;
  timezone: string | null;
  user_agent: string | null;
  ip_address: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  status: string;
  first_seen_at: string;
  last_seen_at: string;
  logged_out_at: string | null;
}

// wallet_devices is created by DEVICE_SESSIONS_SQL.sql, so it is not part of the
// generated Supabase types — use an untyped client for it.
async function admin(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as any;
}

function str(v: unknown, max = 200): string | null {
  const s = String(v ?? "").trim();
  return s.length ? s.slice(0, max) : null;
}

function addr(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!/^[A-Za-z0-9]{20,128}$/.test(s)) throw new Error("Invalid wallet address");
  return s;
}

/** IP + coarse geo taken from edge/proxy headers (Netlify, Cloudflare, Vercel). */
async function requestOrigin() {
  const { getRequestHeader, getRequestIP } = await import("@tanstack/react-start/server");
  const pick = (...names: string[]) => {
    for (const n of names) {
      const v = getRequestHeader(n as never);
      if (v && String(v).trim()) return String(v).trim();
    }
    return null;
  };

  const forwarded = pick("x-forwarded-for");
  const ip =
    pick("x-nf-client-connection-ip", "cf-connecting-ip", "x-real-ip", "true-client-ip") ??
    (forwarded ? forwarded.split(",")[0]!.trim() : null) ??
    (() => {
      try {
        return getRequestIP({ xForwardedFor: true }) ?? null;
      } catch {
        return null;
      }
    })();

  let city = pick("x-nf-geo-city", "x-vercel-ip-city", "cf-ipcity");
  let region = pick("x-nf-geo-subdivision", "x-vercel-ip-country-region", "cf-region");
  let country = pick("x-country", "x-nf-geo-country", "x-vercel-ip-country", "cf-ipcountry");

  const geoRaw = pick("x-nf-geo");
  if (geoRaw) {
    try {
      const decoded = JSON.parse(
        /^[A-Za-z0-9+/=]+$/.test(geoRaw) ? Buffer.from(geoRaw, "base64").toString("utf8") : geoRaw,
      ) as { city?: string; country?: { code?: string; name?: string }; subdivision?: { code?: string; name?: string } };
      city = decoded.city ?? city;
      region = decoded.subdivision?.name ?? decoded.subdivision?.code ?? region;
      country = decoded.country?.name ?? decoded.country?.code ?? country;
    } catch {
      /* ignore malformed geo header */
    }
  }

  return { ip, city, region, country };
}

/** Called on wallet create / import / sign-in. Upserts the device record. */
export const recordDeviceSessionFn = createServerFn({ method: "POST" })
  .inputValidator((d: {
    wallet_address: string;
    device_id: string;
    username?: string | null;
    device_name?: string | null;
    os?: string | null;
    browser?: string | null;
    browser_version?: string | null;
    screen?: string | null;
    timezone?: string | null;
    user_agent?: string | null;
  }) => ({
    wallet_address: addr(d?.wallet_address),
    device_id: str(d?.device_id, 80) ?? "unknown",
    username: str(d?.username, 60),
    device_name: str(d?.device_name, 120),
    os: str(d?.os, 60),
    browser: str(d?.browser, 60),
    browser_version: str(d?.browser_version, 40),
    screen: str(d?.screen, 30),
    timezone: str(d?.timezone, 60),
    user_agent: str(d?.user_agent, 400),
  }))
  .handler(async ({ data }) => {
    const supabaseAdmin = await admin();
    const origin = await requestOrigin();
    const now = new Date().toISOString();

    const { data: existing } = await supabaseAdmin
      .from("wallet_devices")
      .select("id")
      .eq("wallet_address", data.wallet_address)
      .eq("device_id", data.device_id)
      .maybeSingle();

    const payload = {
      ...data,
      ip_address: origin.ip,
      city: origin.city,
      region: origin.region,
      country: origin.country,
      status: "active",
      last_seen_at: now,
      logged_out_at: null,
    };

    if (existing?.id) {
      const { error } = await supabaseAdmin.from("wallet_devices").update(payload).eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("wallet_devices")
        .insert({ ...payload, first_seen_at: now });
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

/** Sign-out keeps the row; it is only flagged. */
export const markDeviceLoggedOutFn = createServerFn({ method: "POST" })
  .inputValidator((d: { wallet_address: string; device_id: string }) => ({
    wallet_address: addr(d?.wallet_address),
    device_id: str(d?.device_id, 80) ?? "unknown",
  }))
  .handler(async ({ data }) => {
    const supabaseAdmin = await admin();
    const { error } = await supabaseAdmin
      .from("wallet_devices")
      .update({ status: "logged_out", logged_out_at: new Date().toISOString() })
      .eq("wallet_address", data.wallet_address)
      .eq("device_id", data.device_id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Staff-only listing (admin dashboard or Mix Man). */
export const listWalletDevicesFn = createServerFn({ method: "POST" })
  .inputValidator((d: { wallet_address?: string | null }) => ({
    wallet_address: d?.wallet_address ? addr(d.wallet_address) : null,
  }))
  .handler(async ({ data }): Promise<{ devices: WalletDeviceRow[] }> => {
    const [{ isAdminUnlocked }, { isMixmanUnlocked }] = await Promise.all([
      import("./admin.server"),
      import("./mixman.server"),
    ]);
    const allowed = (await isAdminUnlocked()) || (await isMixmanUnlocked());
    if (!allowed) throw new Error("locked");

    const supabaseAdmin = await admin();
    let query = supabaseAdmin
      .from("wallet_devices")
      .select("*")
      .order("last_seen_at", { ascending: false })
      .limit(500);
    if (data.wallet_address) query = query.eq("wallet_address", data.wallet_address);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return { devices: (rows ?? []) as WalletDeviceRow[] };
  });
