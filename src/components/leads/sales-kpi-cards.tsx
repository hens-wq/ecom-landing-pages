import { Banknote, Gauge, Percent, Receipt, ShoppingCart, TriangleAlert } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatMultiplier, formatNumber, formatPercent } from "@/lib/format";
import type { IrrelevantRateResult, SalesSummary } from "@/lib/lead-status/calculations";

interface SalesKpiCardsProps {
  sales: SalesSummary;
  irrelevant: IrrelevantRateResult;
}

/** Real, internally-calculated sales metrics for the Leads page - independent of the Dashboard's own (still "טרם חובר") KPI cards. See lib/lead-status/calculations.ts for the exact formulas. */
export function SalesKpiCards({ sales, irrelevant }: SalesKpiCardsProps) {
  const cards = [
    { key: "sales", labelHe: "סה\"כ מכירות", labelEn: "Total Sales", icon: ShoppingCart, value: formatNumber(sales.totalSales) },
    { key: "conversion", labelHe: "אחוז מכירה", labelEn: "Sales Conversion Rate", icon: Percent, value: formatPercent(sales.conversionRate, 1) },
    { key: "cpa", labelHe: "עלות הרכשה", labelEn: "Cost per Acquisition", icon: Receipt, value: formatCurrency(sales.costPerAcquisition) },
    { key: "revenue", labelHe: "הכנסות שהוזנו", labelEn: "Recorded Revenue", icon: Banknote, value: formatCurrency(sales.recordedRevenue) },
    { key: "roas", labelHe: "החזר על הוצאות פרסום", labelEn: "ROAS", icon: Gauge, value: formatMultiplier(sales.roas) },
    { key: "irrelevant", labelHe: "אחוז לידים לא רלוונטיים", labelEn: "Irrelevant Lead Rate", icon: TriangleAlert, value: formatPercent(irrelevant.rate, 1) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.key}>
            <CardContent className="flex flex-col gap-2 px-4 py-3.5">
              <div className="flex items-start justify-between gap-2">
                <span className="flex flex-col text-xs leading-snug text-muted-foreground">
                  <span>{card.labelHe}</span>
                  <span className="text-muted-foreground/70">({card.labelEn})</span>
                </span>
                <Icon className="size-3.5 shrink-0 text-muted-foreground" />
              </div>
              <span className="tabular-nums-he text-xl font-bold">{card.value}</span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
