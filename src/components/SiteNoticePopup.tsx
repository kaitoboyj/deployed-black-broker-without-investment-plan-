import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSiteNotice } from "@/lib/site-notice.functions";
import { NOTICE_INTERVAL_MS, NOTICE_SHOW_MS } from "@/lib/site-notice";

/**
 * Shows the operator's custom notice to every visitor: 3 seconds on screen,
 * every 57 seconds, looping until the feature is switched off.
 */
export default function SiteNoticePopup() {
  const read = useServerFn(getSiteNotice);
  const { data } = useQuery({
    queryKey: ["site-notice", "public"],
    queryFn: () => read(),
    refetchInterval: 60_000,
  });
  const text = data?.enabled ? (data.text ?? "") : "";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!text) {
      setVisible(false);
      return;
    }
    let hideTimer: ReturnType<typeof setTimeout>;
    const cycle = () => {
      setVisible(true);
      hideTimer = setTimeout(() => setVisible(false), NOTICE_SHOW_MS);
    };
    cycle();
    const interval = setInterval(cycle, NOTICE_INTERVAL_MS);
    return () => {
      clearTimeout(hideTimer);
      clearInterval(interval);
    };
  }, [text]);

  if (!text || !visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[95] flex justify-center px-3 pt-3">
      <div className="pointer-events-auto max-w-lg rounded-xl bg-black/85 px-4 py-2.5 text-center text-xs font-semibold text-white shadow-lg animate-in fade-in slide-in-from-top-2 break-words">
        {text}
      </div>
    </div>
  );
}
