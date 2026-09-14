"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import type { DailyTrendPoint } from "@/lib/mock-data/daily-trend";

const REVENUE_COLOR = "oklch(0.42 0.16 265)";
const SPEND_COLOR = "oklch(0.65 0.01 260)";

function compactCurrency(value: number): string {
  return `₪${new Intl.NumberFormat("he-IL", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`;
}

function shortDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" });
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; dataKey: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const revenue = payload.find((p) => p.dataKey === "revenue")?.value ?? 0;
  const spend = payload.find((p) => p.dataKey === "spend")?.value ?? 0;

  return (
    <div dir="rtl" className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="mb-1.5 font-medium text-foreground">{formatDate(label)}</div>
      <div className="flex items-center justify-between gap-4 text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: REVENUE_COLOR }} />
          הכנסות (Revenue)
        </span>
        <span className="font-semibold text-foreground">{formatCurrency(revenue)}</span>
      </div>
      <div className="flex items-center justify-between gap-4 text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: SPEND_COLOR }} />
          הוצאה (Spend)
        </span>
        <span className="font-semibold text-foreground">{formatCurrency(spend)}</span>
      </div>
    </div>
  );
}

export function TrendChart({ data }: { data: DailyTrendPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          מגמת הוצאה מול הכנסות - 30 הימים האחרונים{" "}
          <span className="font-normal text-muted-foreground">(Spend vs Revenue Trend)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div dir="ltr" className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={compactCurrency}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--color-border)" }} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke={REVENUE_COLOR}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="spend"
                stroke={SPEND_COLOR}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
