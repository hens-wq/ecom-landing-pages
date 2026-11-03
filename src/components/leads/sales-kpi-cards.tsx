import { Banknote, Percent, Receipt, ShieldCheck, ShoppingCart, Target, TriangleAlert, Wallet, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { CplTierBadge } from "@/components/shared/cpl-tier-badge";
import { KpiIcon, type KpiTone } from "@/components/shared/kpi-icon";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import type { IrrelevantRateResult } from "@/lib/lead-status/calculations";
import type { LeadKpis } from "@/lib/performance/lead-metrics";
import { cn } from "@/lib/utils";

interface SalesKpiCardsProps {
  kpis: LeadKpis;
  irrelevant: IrrelevantRateResult;
  /** Spend for the selected date range and the campaign scope the leads use. CPL, Qualified CPL and cost per registration are computed from this same figure. */
  periodSpend: number;
  /** The exact range the spend covers: the range chosen in the date picker. */
  periodRange: { since: string; until: string };
  /** Whether the spend checks out against Meta's own account total for the range. */
  spendCheck: "ok" | "gap" | "unavailable" | "none";
  /** Why the cost figures show "—" under the current filters. null when they are computed. */
  costNote: string | null;
  /** Present only when the Sales card should be clickable (see the Leads page) - filters the table to the sales it counts. */
  onTotalSalesClick?: () => void;
  /** Whether that filter is currently applied - shown as a visual "engaged" state on the card, distinct from plain hover. */
  isSalesFilterActive?: boolean;
}

interface KpiCard {
  key: string;
  labelHe: string;
  labelEn: string;
  icon: LucideIcon;
  tone: KpiTone;
  value: string;
  note?: string | null;
  warnings?: Array<string | null>;
  badge?: ReactNode;
}

/** "2026-11-03" -> "03.11.2026". */
function formatIsoDate(iso: string): string {
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
}

/** The exact dates of the selected range, as the date picker shows them. */
function periodNote(range: { since: string; until: string }): string {
  return range.since === range.until ? formatIsoDate(range.since) : `${formatIsoDate(range.since)} – ${formatIsoDate(range.until)}`;
}

/** A figure that cannot be computed shows as "—", never as 0. */
function money(value: number | null): string {
  return value === null ? "—" : formatCurrency(value);
}

function percent(value: number | null): string {
  return value === null ? "—" : formatPercent(value, 1);
}

/**
 * The Leads KPI cards. Every lead figure comes from the shared lead KPIs (lib/performance), and every cost figure is built on
 * the same selected-period spend, so the spend and the leads always share one date range and one campaign scope.
 */
export function SalesKpiCards({
  kpis,
  irrelevant,
  periodSpend,
  periodRange,
  spendCheck,
  costNote,
  onTotalSalesClick,
  isSalesFilterActive,
}: SalesKpiCardsProps) {
  const { green, red, pending, unmapped } = kpis.quality;
  const qualityNote = `מסווגים: ${green + red} (ירוקים ${green} · אדומים ${red}) · ממתינים: ${pending}`;
  const coverageWarning = unmapped > 0 ? `כיסוי חלקי: ${unmapped} לידים בסטטוס שלא מופה לסיווג, ולכן אינם נספרים כירוקים.` : null;
  const noGreenWarning = green === 0 && costNote === null ? "אין לידים ירוקים בטווח, לכן אין עלות לליד מוכשר." : null;
  const spendUnverified = spendCheck === "gap" || spendCheck === "unavailable";
  const unverifiedWarning = spendUnverified ? "מבוסס על הוצאה שלא אומתה מול חשבון Meta." : null;

  const cards: KpiCard[] = [
    { key: "sales", labelHe: "מכירות", labelEn: "Sales", icon: ShoppingCart, tone: "success", value: formatNumber(kpis.sales) },
    {
      key: "closeRate",
      labelHe: "אחוז סגירה",
      labelEn: "Close Rate",
      icon: Percent,
      tone: "success",
      value: percent(kpis.closeRate),
      note: `${formatNumber(kpis.sales)} מתוך ${formatNumber(kpis.leads)} לידים`,
    },
    {
      key: "costPerRegistration",
      labelHe: "עלות להרשמה",
      labelEn: "Cost per Registration",
      icon: Receipt,
      tone: "info",
      value: money(kpis.costPerRegistration),
      warnings: [costNote, unverifiedWarning],
    },
    {
      key: "revenue",
      labelHe: "הכנסות שהוזנו",
      labelEn: "Recorded Revenue",
      icon: Banknote,
      tone: "success",
      value: money(kpis.revenue),
      note: "רק תשלומים שהוזנו בפועל",
    },
    {
      key: "periodSpend",
      labelHe: "הוצאה בטווח הנבחר",
      labelEn: "Selected Period Spend",
      icon: Wallet,
      tone: "info",
      value: money(periodSpend),
      note: periodNote(periodRange),
      warnings: [spendUnverified ? "לא מאומת מול חשבון Meta: הסכום עשוי להיות חלקי." : null],
    },
    {
      key: "irrelevant",
      labelHe: "אחוז לידים לא רלוונטיים",
      labelEn: "Irrelevant Lead Rate",
      icon: TriangleAlert,
      tone: "warning",
      value: percent(irrelevant.rate),
    },
    {
      key: "cpl",
      labelHe: "עלות לליד",
      labelEn: "CPL",
      icon: Target,
      tone: "info",
      value: money(kpis.cpl),
      warnings: [costNote, unverifiedWarning],
      badge: <CplTierBadge cpl={kpis.cpl} />,
    },
    {
      key: "qualifiedCpl",
      labelHe: "עלות לליד מוכשר",
      labelEn: "Qualified CPL",
      icon: ShieldCheck,
      tone: "success",
      value: money(kpis.qualifiedCpl),
      note: qualityNote,
      warnings: [costNote, noGreenWarning, coverageWarning, unverifiedWarning],
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((card) => {
        const isClickable = card.key === "sales" && Boolean(onTotalSalesClick);
        const isActive = card.key === "sales" && isSalesFilterActive;
        const warnings = (card.warnings ?? []).filter((text): text is string => text !== null);
        return (
          <Card
            key={card.key}
            onClick={isClickable ? onTotalSalesClick : undefined}
            role={isClickable ? "button" : undefined}
            tabIndex={isClickable ? 0 : undefined}
            aria-pressed={isClickable ? isActive : undefined}
            onKeyDown={
              isClickable
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onTotalSalesClick!();
                    }
                  }
                : undefined
            }
            className={cn(
              isClickable && "cursor-pointer transition-colors hover:border-primary/50 hover:bg-accent/40",
              isActive && "border-primary bg-primary/5 ring-1 ring-primary/30"
            )}
          >
            <CardContent className="flex flex-col gap-2 px-4 py-3.5">
              <div className="flex items-start justify-between gap-2">
                <span className="flex flex-col text-xs leading-snug text-muted-foreground">
                  <span>{card.labelHe}</span>
                  <span className="text-muted-foreground/70">({card.labelEn})</span>
                </span>
                <KpiIcon icon={card.icon} tone={card.tone} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("tabular-nums-he text-2xl font-bold", card.value === "—" ? "text-muted-foreground" : "text-heading")}>
                  {card.value}
                </span>
                {card.badge}
              </div>
              {card.note && <span className="text-[11px] leading-snug text-muted-foreground">{card.note}</span>}
              {warnings.map((warning) => (
                <span key={warning} className="flex items-start gap-1 text-[11px] leading-snug text-warning-foreground">
                  <TriangleAlert className="mt-px size-3 shrink-0" />
                  {warning}
                </span>
              ))}
              {isActive && <span className="text-[10px] font-medium text-primary">מסונן - לחצו לניקוי</span>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
