import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BellRing, Loader2 } from "lucide-react";
import { getSiteNotice, setSiteNotice } from "@/lib/site-notice.functions";
import { NOTICE_MAX_LEN } from "@/lib/site-notice";

/**
 * "Custom notice popup" — the operator writes a line of text and switches it on.
 * The text then appears on every user's screen for 3 seconds, every 57 seconds,
 * until it is switched off.
 */
export function SiteNoticeControl() {
  const read = useServerFn(getSiteNotice);
  const write = useServerFn(setSiteNotice);
  const client = useQueryClient();
  const settings = useQuery({
    queryKey: ["site-notice", "settings"],
    queryFn: () => read(),
    refetchInterval: 30_000,
  });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const storedText = settings.data?.text ?? "";
  const enabled = settings.data?.enabled ?? false;

  useEffect(() => {
    setText(storedText);
  }, [storedText]);

  const save = async (
    payload: { text?: string; enabled?: boolean },
    tag: string,
    message: string,
  ) => {
    setBusy(tag);
    setErr(null);
    setFlash(null);
    try {
      const result = await write({ data: payload });
      client.setQueryData(["site-notice", "settings"], result);
      await client.invalidateQueries({ queryKey: ["site-notice", "settings"] });
      setFlash(message);
      setTimeout(() => setFlash(null), 1800);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save the notice.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">Custom notice popup</span>
        <span className="text-xs text-muted-foreground">
          {enabled ? "looping on every screen" : "off"}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Write a message and switch it on. It shows on every user's screen for 3 seconds, every 57
        seconds, and repeats until you switch it off.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={NOTICE_MAX_LEN}
        placeholder="Type the message users will see"
        className="mt-3 w-full resize-none rounded-lg glass px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => save({ text }, "text", "Notice text saved")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
        >
          {busy === "text" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save text
        </button>
        {enabled ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => save({ enabled: false }, "off", "Notice switched off")}
            className="rounded-lg glass px-3 py-2 text-xs font-semibold disabled:opacity-40"
          >
            {busy === "off" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Switch off
          </button>
        ) : (
          <button
            type="button"
            disabled={busy !== null || !text.trim()}
            onClick={() => save({ text, enabled: true }, "on", "Notice is now looping for users")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
            title={text.trim() ? "" : "Type the message first"}
          >
            {busy === "on" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <BellRing className="h-3.5 w-3.5" />
            )}
            Switch on
          </button>
        )}
      </div>

      {flash && <p className="mt-2 text-xs text-success">{flash}</p>}
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
    </div>
  );
}
