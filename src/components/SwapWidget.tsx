import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { notify } from "@/lib/notify";

interface Props {
  privateKey: string;
  address: string;
}

// Loads thirdweb entirely on the client to keep it out of the SSR bundle.
export function SwapWidget({ privateKey, address }: Props) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [mod, setMod] = useState<null | typeof import("./SwapWidgetInner")>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/public/thirdweb-config")
      .then((r) => r.json())
      .then((d) => {
        if (!d.clientId) {
          setErr("Swap is not configured yet — the site owner needs to set THIRDWEB_CLIENT_ID.");
          return;
        }
        setClientId(d.clientId);
      })
      .catch(() => setErr("Could not load swap configuration."));
    import("./SwapWidgetInner").then(setMod).catch((e) => {
      setErr(e instanceof Error ? e.message : "Failed to load swap widget");
    });
  }, []);

  const Inner = useMemo(() => mod?.SwapWidgetInner ?? null, [mod]);

  if (err) {
    return (
      <div className="glass rounded-xl p-4 text-sm text-destructive">{err}</div>
    );
  }
  if (!clientId || !Inner) {
    return (
      <div className="glass rounded-xl p-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading swap widget…
      </div>
    );
  }

  return (
    <Inner
      clientId={clientId}
      privateKey={privateKey}
      address={address}
      onSuccess={(payload) => notify({ event: "swap_success", address, extra: JSON.stringify(payload).slice(0, 800) })}
      onError={(msg) => notify({ event: "swap_error", address, extra: msg.slice(0, 800) })}
    />
  );
}
