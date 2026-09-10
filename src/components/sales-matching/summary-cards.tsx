import { CheckCircle2, ListChecks, PieChart, XCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatNumber, formatPercent } from "@/lib/format";
import type { SalesMatchStats } from "@/lib/mock-data/sales-matches";

interface SummaryCardsProps {
  stats: SalesMatchStats;
}

export function SalesMatchingSummaryCards({ stats }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card>
        <CardContent className="flex flex-col gap-2 px-4 py-3.5">
          <div className="flex items-start justify-between gap-2">
            <span className="flex flex-col text-xs leading-snug text-muted-foreground">
              <span>סה״כ מכירות</span>
              <span className="text-muted-foreground/70">(Total Sales)</span>
            </span>
            <ListChecks className="size-3.5 shrink-0 text-muted-foreground" />
          </div>
          <span className="text-xl font-bold">{formatNumber(stats.total)}</span>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-2 px-4 py-3.5">
          <div className="flex items-start justify-between gap-2">
            <span className="flex flex-col text-xs leading-snug text-muted-foreground">
              <span>מכירות שהותאמו</span>
              <span className="text-muted-foreground/70">(Matched)</span>
            </span>
            <CheckCircle2 className="size-3.5 shrink-0 text-success" />
          </div>
          <span className="text-xl font-bold text-success">{formatNumber(stats.matched)}</span>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-2 px-4 py-3.5">
          <div className="flex items-start justify-between gap-2">
            <span className="flex flex-col text-xs leading-snug text-muted-foreground">
              <span>מכירות ללא שיוך</span>
              <span className="text-muted-foreground/70">(Unmatched)</span>
            </span>
            <XCircle className="size-3.5 shrink-0 text-destructive" />
          </div>
          <span className="text-xl font-bold text-destructive">{formatNumber(stats.unmatched)}</span>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-2 px-4 py-3.5">
          <div className="flex items-start justify-between gap-2">
            <span className="flex flex-col text-xs leading-snug text-muted-foreground">
              <span>אחוז התאמה</span>
              <span className="text-muted-foreground/70">(Match Rate)</span>
            </span>
            <PieChart className="size-3.5 shrink-0 text-muted-foreground" />
          </div>
          <span className="text-xl font-bold">{formatPercent(stats.matchRate, 0)}</span>
          {stats.needsReview > 0 && (
            <span className="text-[11px] text-warning-foreground">{stats.needsReview} דורשות בדיקה ידנית</span>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
