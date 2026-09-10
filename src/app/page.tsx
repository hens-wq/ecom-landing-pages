"use client";

import { useMemo, useState } from "react";

import { DashboardControls } from "@/components/dashboard/controls";
import { InsightsCallout } from "@/components/dashboard/insights-callout";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { PerformanceTable } from "@/components/dashboard/performance-table";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { aggregateTotals, buildPerformanceTree } from "@/lib/aggregate";
import { DEFAULT_DATE_RANGE_PRESET_ID, DATE_RANGE_PRESETS } from "@/lib/constants";
import { campaigns, dailyTrend } from "@/lib/mock-data";

export default function DashboardPage() {
  const [presetId, setPresetId] = useState(DEFAULT_DATE_RANGE_PRESET_ID);
  const scale = DATE_RANGE_PRESETS.find((preset) => preset.id === presetId)?.scale ?? 1;

  const campaignRows = useMemo(() => buildPerformanceTree(campaigns, scale), [scale]);
  const totals = useMemo(() => aggregateTotals(campaignRows), [campaignRows]);

  return (
    <div className="flex flex-col gap-5">
      <DashboardControls presetId={presetId} onPresetChange={setPresetId} />
      <KpiCards metrics={totals} />
      <TrendChart data={dailyTrend} />
      <InsightsCallout campaignRows={campaignRows} />
      <PerformanceTable campaignRows={campaignRows} />
    </div>
  );
}
