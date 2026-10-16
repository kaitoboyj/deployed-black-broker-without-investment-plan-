import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCheck, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { investmentPlans, planGroups, setDisabledPlanIds } from "@/lib/investment-plans";
import { getDisabledPlans, setPlanDisabled } from "@/lib/plan-settings.functions";

export function InvestmentPlanControl() {
  const read = useServerFn(getDisabledPlans);
  const write = useServerFn(setPlanDisabled);
  const client = useQueryClient();
  const settings = useQuery({
    queryKey: ["investment-plan-settings"],
    queryFn: () => read(),
    refetchInterval: 30_000,
  });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);
  const disabled = settings.data?.disabled ?? [];
  async function save(
    data: { id?: string; disabled?: boolean; enableAll?: boolean },
    message: string,
  ) {
    setBusy(true);
    setFeedback("");
    setFailed(false);
    try {
      const result = await write({ data });
      setDisabledPlanIds(result.disabled);
      client.setQueryData(["investment-plan-settings"], result);
      await client.invalidateQueries({ queryKey: ["investment-plan-settings"] });
      setFeedback(message);
    } catch (error) {
      setFailed(true);
      setFeedback(error instanceof Error ? error.message : "Could not save plan availability.");
    } finally {
      setBusy(false);
    }
  }
  const unavailable = !settings.data?.available;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
        <div>
          <h2 className="font-display text-xl font-semibold">Investment plans</h2>
          <p className="mt-1 text-xs text-muted-foreground">Site-wide availability</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Refresh plans"
            title="Refresh plans"
            onClick={() => settings.refetch()}
          >
            <RefreshCw />
          </Button>
          <Button
            disabled={busy || unavailable}
            onClick={() => save({ enableAll: true }, "All plans activated")}
          >
            <CheckCheck />
            Activate all
          </Button>
        </div>
      </div>
      {settings.isPending ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
          Loading plans…
        </p>
      ) : (
        unavailable && (
          <p role="alert" className="text-sm text-destructive">
            Plan settings are unavailable. Check your site's database connection and retry.
          </p>
        )
      )}
      {feedback && (
        <p
          role={failed ? "alert" : "status"}
          className={failed ? "text-sm text-destructive" : "text-sm text-success"}
        >
          {feedback}
        </p>
      )}
      {planGroups.map((group) => (
        <section key={group.term}>
          <h3 className="mb-3 font-display text-base font-semibold">{group.title}</h3>
          <div className="divide-y divide-border border-y border-border">
            {investmentPlans
              .filter((plan) => plan.term === group.term)
              .map((plan) => {
                const off = disabled.includes(plan.id);
                return (
                  <div key={plan.id} className="flex items-center justify-between gap-3 py-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        ${plan.amount.toLocaleString()} · {plan.label}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Target APY {plan.targetApy}%
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={off ? "text-xs text-muted-foreground" : "text-xs text-success"}
                      >
                        {off ? "Deactivated" : "Active"}
                      </span>
                      <Switch
                        checked={!off}
                        disabled={busy || unavailable}
                        aria-label={`${plan.id} active`}
                        onCheckedChange={(active) =>
                          save(
                            { id: plan.id, disabled: !active },
                            `$${plan.amount.toLocaleString()} · ${plan.label} ${active ? "activated" : "deactivated"}`,
                          )
                        }
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
