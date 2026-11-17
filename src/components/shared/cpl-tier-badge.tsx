import { Badge } from "@/components/ui/badge";
import { CPL_TIER_HINT, CPL_TIER_LABELS, cplTier, type CplTier } from "@/lib/performance/cpl-tier";
import { cn } from "@/lib/utils";

const VARIANT: Record<CplTier, "success" | "warning" | "destructive"> = {
  on_target: "success",
  follow_up: "warning",
  warning: "destructive",
  severe: "destructive",
};

/** The agreed CPL band, as a label and a colour - never colour alone. Renders nothing when there is no CPL to judge. */
export function CplTierBadge({ cpl }: { cpl: number | null | undefined }) {
  const tier = cplTier(cpl);
  if (!tier) return null;

  return (
    <Badge
      variant={VARIANT[tier]}
      title={CPL_TIER_HINT}
      className={cn(tier === "severe" && "bg-destructive text-destructive-foreground")}
    >
      {CPL_TIER_LABELS[tier]}
    </Badge>
  );
}
