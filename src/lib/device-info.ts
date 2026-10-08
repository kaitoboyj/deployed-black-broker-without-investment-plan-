// Client-only device fingerprint helpers used for the "logged-in devices" list.

const DEVICE_ID_KEY = "prime:device-id:v1";

export function deviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = globalThis.crypto?.randomUUID?.() ?? `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

export interface DeviceDescriptor {
  device_id: string;
  device_name: string;
  os: string;
  browser: string;
  browser_version: string;
  screen: string;
  timezone: string | null;
  user_agent: string;
}

function detectOs(ua: string): string {
  const m =
    /Windows NT ([\d.]+)/.exec(ua) ??
    /Android ([\d.]+)/.exec(ua) ??
    /CPU (?:iPhone )?OS ([\d_]+)/.exec(ua) ??
    /Mac OS X ([\d_.]+)/.exec(ua);
  const version = m?.[1]?.replace(/_/g, ".") ?? "";
  if (/Windows/.test(ua)) {
    const map: Record<string, string> = { "10.0": "10/11", "6.3": "8.1", "6.2": "8", "6.1": "7" };
    return `Windows ${map[version] ?? version}`.trim();
  }
  if (/Android/.test(ua)) return `Android ${version}`.trim();
  if (/iPhone|iPad|iPod/.test(ua)) return `iOS ${version}`.trim();
  if (/Mac OS X/.test(ua)) return `macOS ${version}`.trim();
  if (/CrOS/.test(ua)) return "ChromeOS";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown OS";
}

function detectBrowser(ua: string): { browser: string; version: string } {
  const tests: Array<[string, RegExp]> = [
    ["Edge", /Edg(?:e|A|iOS)?\/([\d.]+)/],
    ["Opera", /OPR\/([\d.]+)/],
    ["Samsung Internet", /SamsungBrowser\/([\d.]+)/],
    ["Firefox", /(?:Firefox|FxiOS)\/([\d.]+)/],
    ["Chrome", /(?:Chrome|CriOS)\/([\d.]+)/],
    ["Safari", /Version\/([\d.]+).*Safari/],
  ];
  for (const [name, re] of tests) {
    const m = re.exec(ua);
    if (m) return { browser: name, version: m[1] ?? "" };
  }
  return { browser: "Unknown browser", version: "" };
}

function detectDeviceName(ua: string): string {
  if (/iPad/.test(ua)) return "iPad";
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPod/.test(ua)) return "iPod";
  const android = /Android[^;]*;\s*([^)]+?)(?:\sBuild|\))/.exec(ua);
  if (android?.[1]) return android[1].trim();
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows PC";
  if (/CrOS/.test(ua)) return "Chromebook";
  if (/Linux/.test(ua)) return "Linux PC";
  return "Unknown device";
}

export function describeDevice(): DeviceDescriptor {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const { browser, version } = detectBrowser(ua);
  let timezone: string | null = null;
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    timezone = null;
  }
  return {
    device_id: deviceId(),
    device_name: detectDeviceName(ua),
    os: detectOs(ua),
    browser,
    browser_version: version,
    screen: typeof window !== "undefined" ? `${window.screen?.width ?? 0}x${window.screen?.height ?? 0}` : "",
    timezone,
    user_agent: ua.slice(0, 400),
  };
}
