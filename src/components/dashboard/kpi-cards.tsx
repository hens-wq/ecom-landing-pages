import { Banknote, Gauge, Percent, Receipt, ShoppingCart, Tags, Target, Users, type LucideIcon } from "lucide-react";

import { CplTierBadge } from "@/components/shared/cpl-tier-badge";
import { KpiIcon, type KpiTone } from "@/components/shared/kpi-icon";
import { Card, CardContent } from "@/components/ui/card";
import { cellDisplay, columnByKey } from "@/lib/performance/display";
import { cn } from "@/lib/utils";
import type { PerformanceMetrics } from "@/lib/types";

const KPI_ORDER: Array<{ key: keyof PerformanceMetrics; icon: LucideIcon; tone: KpiTone }> = [
  { key: "spend", icon: Tags, tone: "info" },
  { key: "leads", icon: Users, tone: "info" },
  { key: "cpl", icon: Target, tone: "info" },
  { key: "sales", icon: ShoppingCart, tone: "success" },
  { key: "closeRate", icon: Percent, tone: "success" },
  { key: "costPerSale", icon: Receipt, tone: "info" },
  { key: "revenue", icon: Banknote, tone: "success" },
  { key: "roas", icon: Gauge, tone: "info" },
];

/** Shown under a KPI wherever its basis needs saying. */
const KPI_NOTE: Partial<Record<keyof PerformanceMetrics, string>> = {
  cpl: "CPL גבוה אינו הוראת עצירה כשההרשמות מצדיקות את ההוצאה.",
  roas: "הכנסות שהוזנו ÷ הוצאה. לא מלוא שווי העסקאות ולא רווח נקי.",
};

interface KpiCardsProps {
  totals: PerformanceMetrics;
  /** False when the lead data could not be loaded - lead figures then show "—", never 0. */
  leadsKnown: boolean;
  unknownStatusLeads: number;
}

export function KpiCards({ totals, leadsKnown, unknownStatusLeads }: KpiCardsProps) {
  const displayRow = { metrics: totals, isUnassigned: false, leadsKnown, unknownStatusLeads };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {KPI_ORDER.map(({ key, icon: Icon, tone }) => {
        const column = columnByKey(key);
        if (!column) return null;
        const display = cellDisplay(displayRow, column);

        return (
          <Card key={key}>
            <CardContent className="flex flex-col gap-2 px-4 py-3.5">
              <div className="flex items-start justify-between gap-2">
                <span className="flex flex-col text-xs leading-snug text-muted-foreground">
                  <span>{column.labelHe}</span>
                  <span className="text-muted-foreground/70">({column.labelEn})</span>
                </span>
                <KpiIcon icon={Icon} tone={tone} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("tabular-nums-he text-2xl font-bold", display.state === "value" ? "text-heading" : "text-muted-foreground")}>
                  {display.text}
                </span>
                {display.partial && (
                  <span className="text-[11px] font-medium text-warning-foreground" title="חלק מהלידים בלי סטטוס">
                    חלקי
                  </span>
                )}
                {key === "cpl" && display.state === "value" && <CplTierBadge cpl={totals.cpl} />}
              </div>
              {KPI_NOTE[key] && <span className="text-[11px] leading-snug text-muted-foreground">{KPI_NOTE[key]}</span>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
