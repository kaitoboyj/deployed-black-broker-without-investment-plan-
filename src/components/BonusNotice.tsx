import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Gift } from "lucide-react";
import { getDisplayBalances } from "@/lib/admin.functions";
import { readDisplayFlags } from "@/lib/display-flags";

const SHOW_MS = 2000;
const HIDE_MS = 30000;

/** Top-bar bonus pop-up: visible 2s, hidden 30s, looping while a bonus is set. */
export function BonusNotice({ address }: { address?: string }) {
  const getDisplay = useServerFn(getDisplayBalances);
  const [bonus, setBonus] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!address) return setBonus(0);
    let cancelled = false;
    const load = () =>
      getDisplay({ data: { wallet_address: address, addresses: [] } })
        .then((r) => !cancelled && setBonus(readDisplayFlags(r.overrides?.token_overrides).bonus))
        .catch(() => {});
    load();
    const id = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(id); };
  }, [address, getDisplay]);

  useEffect(() => {
    if (bonus <= 0) return setVisible(false);
    let t: ReturnType<typeof setTimeout>;
    const cycle = () => {
      setVisible(true);
      t = setTimeout(() => {
        setVisible(false);
        t = setTimeout(cycle, HIDE_MS);
      }, SHOW_MS);
    };
    t = setTimeout(cycle, 1500);
    return () => clearTimeout(t);
  }, [bonus]);

  if (!visible || bonus <= 0) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-full z-50 flex justify-center px-4 pt-2">
      <div role="status" className="bonus-pop flex items-center gap-2 rounded-full border border-primary/50 bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-2xl sm:text-sm">
        <Gift className="h-4 w-4 text-primary" />
        You will receive a <span className="font-mono text-primary">${bonus.toLocaleString()}</span> bonus within the next 24 hours
      </div>
    </div>
  );
}
