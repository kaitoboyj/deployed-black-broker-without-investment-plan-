import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

/** 24h change pill: green with + when bullish, red with − when bearish. */
export function ChangeBadge({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-mono font-semibold",
        up ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
      )}
      title="24h change"
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : "−"}
      {Math.abs(pct).toFixed(2)}%
    </span>
  );
}
