import { Banknote, Gauge, Percent, Receipt, ShoppingCart, Tags, Target, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatMultiplier, formatNumber, formatPercent } from "@/lib/format";
import type { PerformanceMetrics } from "@/lib/types";

interface KpiDef {
  key: string;
  labelHe: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string }>;
  format: (m: PerformanceMetrics) => string;
}

const KPI_DEFS: KpiDef[] = [
  { key: "spend", labelHe: "הוצאה", labelEn: "Spend", icon: Tags, format: (m) => formatCurrency(m.spend) },
  { key: "leads", labelHe: "לידים", labelEn: "Leads", icon: Users, format: (m) => formatNumber(m.leads) },
  { key: "cpl", labelHe: "עלות לליד", labelEn: "CPL", icon: Target, format: (m) => formatCurrency(m.cpl) },
  { key: "sales", labelHe: "מכירות", labelEn: "Sales", icon: ShoppingCart, format: (m) => formatNumber(m.sales) },
  { key: "closeRate", labelHe: "אחוז סגירה", labelEn: "Close Rate", icon: Percent, format: (m) => formatPercent(m.closeRate, 1) },
  { key: "costPerSale", labelHe: "עלות למכירה", labelEn: "Cost per Sale", icon: Receipt, format: (m) => formatCurrency(m.costPerSale) },
  { key: "revenue", labelHe: "הכנסות", labelEn: "Revenue", icon: Banknote, format: (m) => formatCurrency(m.revenue) },
  { key: "roas", labelHe: "החזר על הוצאות פרסום", labelEn: "ROAS", icon: Gauge, format: (m) => formatMultiplier(m.roas) },
];

export function KpiCards({ metrics }: { metrics: PerformanceMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {KPI_DEFS.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.key}>
            <CardContent className="flex flex-col gap-2 px-4 py-3.5">
              <div className="flex items-start justify-between gap-2">
                <span className="flex flex-col text-xs leading-snug text-muted-foreground">
                  <span>{kpi.labelHe}</span>
                  <span className="text-muted-foreground/70">({kpi.labelEn})</span>
                </span>
                <Icon className="size-3.5 shrink-0 text-muted-foreground" />
              </div>
              <span className="tabular-nums-he text-xl font-bold">{kpi.format(metrics)}</span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
