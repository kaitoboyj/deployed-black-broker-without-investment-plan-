import { useEffect, useState } from "react";

/** Format a remaining duration as `3d 04h 05m 06s` (or `04h 05m 06s` under a day). */
function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return days > 0
    ? `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
    : `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

/**
 * Live countdown to a plan's end time. Renders nothing when there is no plan
 * (endMs is null), so it only shows once a user has started a plan.
 */
export function PlanCountdown({ endMs, className }: { endMs: number | null; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endMs) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [endMs]);
  if (!endMs) return null;
  return (
    <span className={className}>
      {endMs - now <= 0 ? "Completed" : formatRemaining(endMs - now)}
    </span>
  );
}
