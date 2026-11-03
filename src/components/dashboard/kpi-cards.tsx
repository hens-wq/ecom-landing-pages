import { Banknote, Gauge, Percent, Receipt, ShoppingCart, Tags, Target, Users, type LucideIcon } from "lucide-react";

import { CplTierBadge } from "@/components/shared/cpl-tier-badge";
import { KpiIcon, type KpiTone } from "@/components/shared/kpi-icon";
import { Card, CardContent } from "@/components/ui/card";
import { cellDisplay, columnByKey } from "@/lib/performance/display";
import type { PerformanceMetrics } from "@/lib/types";
import { cn } from "@/lib/utils";

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

/** "2026-11-03" -> "03.11.2026". */
function formatIsoDate(iso: string): string {
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
}

/** The exact dates of the selected range, as the date picker shows them. */
function periodNote(range: { since: string; until: string }): string {
  return range.since === range.until ? formatIsoDate(range.since) : `${formatIsoDate(range.since)} – ${formatIsoDate(range.until)}`;
}

interface KpiCardsProps {
  totals: PerformanceMetrics;
  /** False when the lead data could not be loaded - lead figures then show "—", never 0. */
  leadsKnown: boolean;
  unknownStatusLeads: number;
  /** The exact date range the spend covers: the range chosen in the date picker. */
  periodRange: { since: string; until: string };
  /** Whether the spend checks out against Meta's own account total for the range. */
  spendCheck: "ok" | "gap" | "unavailable" | "none";
}

export function KpiCards({ totals, leadsKnown, unknownStatusLeads, periodRange, spendCheck }: KpiCardsProps) {
  const displayRow = { metrics: totals, isUnassigned: false, isUnlisted: false, leadsKnown, unknownStatusLeads };
  const spendUnverified = spendCheck === "gap" || spendCheck === "unavailable";

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {KPI_ORDER.map(({ key, icon: Icon, tone }) => {
        const column = columnByKey(key);
        if (!column) return null;
        const display = cellDisplay(displayRow, column);
        const isSpend = key === "spend";
        const labelHe = isSpend ? "הוצאה בטווח הנבחר" : column.labelHe;
        const labelEn = isSpend ? "Selected Period Spend" : column.labelEn;
        const note = isSpend ? periodNote(periodRange) : (KPI_NOTE[key] ?? null);

        let warning: string | null = null;
        if (spendUnverified) {
          if (isSpend) warning = "לא מאומת מול חשבון Meta: הסכום עשוי להיות חלקי.";
          else if (key === "cpl" || key === "costPerSale") warning = "מבוסס על הוצאה שלא אומתה מול Meta.";
        }

        return (
          <Card key={key}>
            <CardContent className="flex flex-col gap-2 px-4 py-3.5">
              <div className="flex items-start justify-between gap-2">
                <span className="flex flex-col text-xs leading-snug text-muted-foreground">
                  <span>{labelHe}</span>
                  <span className="text-muted-foreground/70">({labelEn})</span>
                </span>
                <KpiIcon icon={Icon} tone={tone} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn("tabular-nums-he text-2xl font-bold", display.state === "value" ? "text-heading" : "text-muted-foreground")}
                >
                  {display.text}
                </span>
                {display.partial && (
                  <span className="text-[11px] font-medium text-warning-foreground" title="חלק מהלידים בלי סטטוס">
                    חלקי
                  </span>
                )}
                {key === "cpl" && display.state === "value" && <CplTierBadge cpl={totals.cpl} />}
              </div>
              {note && <span className="text-[11px] leading-snug text-muted-foreground">{note}</span>}
              {warning && <span className="text-[11px] font-medium leading-snug text-warning-foreground">{warning}</span>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
