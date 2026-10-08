/** Tiny white "eligible for yield" line with a green status dot at the end. */
export function YieldEligibleNote() {
  return (
    <p className="mt-1 flex items-center gap-1.5 text-[10px] font-medium text-white">
      You are now eligible for yield
      <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]" />
    </p>
  );
}
