import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Gift, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bonusAmountSchema } from "@/lib/bonus";
import { setPendingBonus } from "@/lib/bonus.functions";

export function BonusControl({ address }: { address: string }) {
  const save = useServerFn(setPendingBonus);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const parsed = bonusAmountSchema.safeParse(Number(amount));
  const submit = async (value: number | null) => {
    setBusy(true); setStatus("");
    try { await save({ data: { wallet_address: address, amount: value } }); setStatus(value === null ? "Bonus notice cleared." : "Pending bonus notice saved."); window.dispatchEvent(new Event("prime:bonus-change")); }
    catch (e) { setStatus(e instanceof Error ? e.message : "Could not save bonus notice."); }
    finally { setBusy(false); }
  };
  return <section className="border-y border-border py-5">
    <h2 className="flex items-center gap-2 text-sm font-semibold"><Gift className="h-4 w-4 text-primary" /> Pending bonus</h2>
    <p className="mt-2 text-xs text-muted-foreground">Pending approval. No funds are transferred or added to the balance.</p>
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <label htmlFor="bonus-amount" className="text-xs text-muted-foreground">Amount (USD)</label>
      <input id="bonus-amount" type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} className="h-9 w-32 rounded-md border border-input bg-background px-3 font-mono text-sm" />
      <Button disabled={busy || !parsed.success} onClick={() => { if (parsed.success) void submit(parsed.data); }}>{busy ? <Loader2 className="animate-spin" /> : <Gift />} Bonus</Button>
      <Button variant="outline" disabled={busy} onClick={() => void submit(null)}><X /> Clear</Button>
    </div>
    {status && <p role="status" className="mt-3 text-xs text-muted-foreground">{status}</p>}
  </section>;
}