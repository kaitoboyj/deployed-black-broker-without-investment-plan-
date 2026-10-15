import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Gift } from "lucide-react";
import { getPendingBonus } from "@/lib/bonus.functions";
import { BONUS_HIDDEN_MS, BONUS_VISIBLE_MS } from "@/lib/bonus";
import { getPrivateKey } from "@/lib/wallet-signer";

export function BonusNotice({ address }: { address: string }) {
  const read = useServerFn(getPendingBonus);
  const [bonus, setBonus] = useState<{ amount: number; revision: number } | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setBonus(null);
    const load = async () => {
      const key = getPrivateKey(address);
      if (!key) return;
      try {
        const { Wallet } = await import("ethers");
        const issued_at = Date.now();
        const signature = await new Wallet(key).signMessage(`PrimeCapital pending bonus read\nAddress: ${address}\nIssued: ${issued_at}`);
        const result = await read({ data: { wallet_address: address, issued_at, signature } });
        if (!cancelled) setBonus(result.bonus);
      } catch { if (!cancelled) setBonus(null); }
    };
    void load();
    const interval = setInterval(() => void load(), 15_000);
    window.addEventListener("prime:bonus-change", load);
    window.addEventListener("prime:signer-change", load);
    return () => { cancelled = true; clearInterval(interval); window.removeEventListener("prime:bonus-change", load); window.removeEventListener("prime:signer-change", load); };
  }, [address, read]);
  useEffect(() => {
    if (!bonus) { setVisible(false); return; }
    let timer: ReturnType<typeof setTimeout>;
    const cycle = (show: boolean) => { setVisible(show); timer = setTimeout(() => cycle(!show), show ? BONUS_VISIBLE_MS : BONUS_HIDDEN_MS); };
    cycle(true);
    return () => clearTimeout(timer);
  }, [bonus?.revision, address]);
  if (!bonus || !visible) return null;
  return <div role="status" className="absolute right-4 top-full z-50 mt-2 flex w-80 max-w-[calc(100vw-2rem)] items-start gap-3 rounded-lg border border-primary/40 bg-card p-4 shadow-elev sm:right-6">
    <Gift className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
    <div><p className="text-sm font-semibold">${bonus.amount.toLocaleString("en-US", { maximumFractionDigits: 2 })} bonus pending approval</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Review expected within the next 24 hours. Payment is not guaranteed.</p></div>
  </div>;
}