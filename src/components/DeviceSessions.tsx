import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPin, Monitor, RefreshCw, Smartphone } from "lucide-react";
import { listWalletDevicesFn, type WalletDeviceRow } from "@/lib/devices.functions";

/** Permanent record of every device that has signed in to a wallet. */
export function DeviceSessions({ address }: { address?: string | null }) {
  const list = useServerFn(listWalletDevicesFn);
  const [rows, setRows] = useState<WalletDeviceRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await list({ data: { wallet_address: address ?? null } });
      setRows(r.devices);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load devices");
      setRows([]);
    } finally {
      setBusy(false);
    }
  }, [list, address]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Every device that has ever signed in {address ? "to this wallet" : "on the platform"}. Records are kept
          forever — signed-out devices stay listed and are marked as logged out.
        </p>
        <button
          onClick={() => void load()}
          className="inline-flex shrink-0 items-center gap-1 rounded-md glass px-2.5 py-1.5 text-xs hover:bg-white/10"
        >
          <RefreshCw className={busy ? "h-3 w-3 animate-spin" : "h-3 w-3"} /> Refresh
        </button>
      </div>

      {err && <p className="text-xs text-destructive">{err}</p>}

      {rows === null ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading devices
        </div>
      ) : rows.length === 0 ? (
        <div className="glass rounded-xl p-6 text-center text-sm text-muted-foreground">
          No device records yet.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((d) => {
            const mobile = /iPhone|iPad|Android|iPod/i.test(`${d.device_name ?? ""} ${d.os ?? ""}`);
            const active = d.status === "active";
            const place = [d.city, d.region, d.country].filter(Boolean).join(", ");
            return (
              <div key={d.id} className="glass rounded-xl p-4 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  {mobile ? <Smartphone className="h-4 w-4 text-primary" /> : <Monitor className="h-4 w-4 text-primary" />}
                  <span className="text-sm font-semibold text-foreground">{d.device_name ?? "Unknown device"}</span>
                  <span className="text-muted-foreground">{d.os ?? "Unknown OS"}</span>
                  <span className="text-muted-foreground">
                    · {d.browser ?? "browser"} {d.browser_version ?? ""}
                  </span>
                  <span
                    className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      active ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {active ? "Logged in" : "Logged out"}
                  </span>
                </div>

                <div className="mt-2 grid gap-1 sm:grid-cols-2">
                  <p className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {place || "Location unknown"}
                    {d.timezone ? ` · ${d.timezone}` : ""}
                  </p>
                  <p className="text-muted-foreground">
                    IP: <span className="font-mono text-foreground">{d.ip_address ?? "unknown"}</span>
                    {d.screen ? ` · ${d.screen}` : ""}
                  </p>
                  {!address && (
                    <p className="text-muted-foreground sm:col-span-2">
                      Wallet: <span className="font-mono break-all text-foreground">{d.wallet_address}</span>
                      {d.username ? ` · ${d.username}` : ""}
                    </p>
                  )}
                  <p className="text-muted-foreground">First seen {new Date(d.first_seen_at).toLocaleString()}</p>
                  <p className="text-muted-foreground">
                    {active
                      ? `Last active ${new Date(d.last_seen_at).toLocaleString()}`
                      : `Logged out ${d.logged_out_at ? new Date(d.logged_out_at).toLocaleString() : "—"}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
