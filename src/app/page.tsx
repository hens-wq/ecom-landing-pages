"use client";

import { useEffect, useMemo, useState } from "react";

import { DashboardControls } from "@/components/dashboard/controls";
import { DataSourceBadge } from "@/components/dashboard/data-source-badge";
import { InsightsCallout } from "@/components/dashboard/insights-callout";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { MetaSalesNote } from "@/components/dashboard/meta-sales-note";
import { PerformanceTable } from "@/components/dashboard/performance-table";
import { AdvertisingErrorPanel, AdvertisingLoadingPanel, EmptyCampaignsPanel } from "@/components/dashboard/status-panels";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { aggregateTotals, buildPerformanceTree } from "@/lib/aggregate";
import { presetDaysToDateRange } from "@/lib/advertising/date-range";
import { getInternalSalesTotals, INTERNAL_SALES_BASELINE_DAYS } from "@/lib/advertising/internal-sales";
import type { AdvertisingResult } from "@/lib/advertising";
import { calcCloseRate, calcCostPerSale, calcROAS } from "@/lib/calculations";
import { DATE_RANGE_PRESETS, DEFAULT_DATE_RANGE_PRESET_ID } from "@/lib/constants";
import { dailyTrend } from "@/lib/mock-data";
import type { PerformanceMetrics } from "@/lib/types";

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; code: string; message: string }
  | { phase: "ready"; data: AdvertisingResult };

export default function DashboardPage() {
  const [presetId, setPresetId] = useState(DEFAULT_DATE_RANGE_PRESET_ID);
  const preset = DATE_RANGE_PRESETS.find((p) => p.id === presetId) ?? DATE_RANGE_PRESETS[2];
  const range = useMemo(() => presetDaysToDateRange(preset.days), [preset.days]);
  const rangeKey = `${range.since}_${range.until}`;

  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const [trackedRangeKey, setTrackedRangeKey] = useState(rangeKey);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  // Reset to the loading state when the selected date range changes - done
  // during render (React's documented "adjust state when a prop changes"
  // pattern), not in an effect, so a manual refresh (which doesn't touch the
  // range) never blanks the page - only the fetch effect below does that work.
  if (rangeKey !== trackedRangeKey) {
    setTrackedRangeKey(rangeKey);
    setState({ phase: "loading" });
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const response = await fetch(`/api/advertising?since=${range.since}&until=${range.until}`, { cache: "no-store" });
        const json = await response.json();
        if (cancelled) return;

        if (!response.ok || json.error) {
          setState({
            phase: "error",
            code: json.error?.code ?? "unknown_error",
            message: json.error?.message ?? "שגיאה לא צפויה בטעינת נתוני הפרסום.",
          });
          return;
        }
        setState({ phase: "ready", data: json as AdvertisingResult });
      } catch {
        if (!cancelled) {
          setState({
            phase: "error",
            code: "network_error",
            message: "לא ניתן היה להתחבר לשרת. בדקו את החיבור לאינטרנט ונסו שוב.",
          });
        }
      } finally {
        if (!cancelled) setIsRefreshing(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [range.since, range.until, refreshTick]);

  const campaignRows = useMemo(
    () => (state.phase === "ready" ? buildPerformanceTree(state.data.campaigns) : []),
    [state]
  );

  const totals: PerformanceMetrics = useMemo(() => {
    const advTotals = aggregateTotals(campaignRows);
    // Scaled by the same day-count factor as the mock advertising baseline, so
    // Sales stays proportional to whatever period is selected (a 1-day view
    // shouldn't carry a full 30-day sales total, which would blow up Close
    // Rate / ROAS into nonsensical values) - see lib/advertising/internal-sales.ts.
    const internalSales = getInternalSalesTotals(preset.days / INTERNAL_SALES_BASELINE_DAYS);
    return {
      ...advTotals,
      // Sales-side KPIs are always sourced from the internal/mock sales layer,
      // independent of whichever advertising provider supplied the rest of
      // these numbers.
      sales: internalSales.sales,
      revenue: internalSales.revenue,
      closeRate: calcCloseRate(internalSales.sales, advTotals.leads),
      costPerSale: calcCostPerSale(advTotals.spend, internalSales.sales),
      roas: calcROAS(internalSales.revenue, advTotals.spend),
    };
  }, [campaignRows, preset.days]);

  const source = state.phase === "ready" ? state.data.source : undefined;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <DashboardControls
          presetId={presetId}
          onPresetChange={setPresetId}
          onRefresh={() => {
            setIsRefreshing(true);
            setRefreshTick((tick) => tick + 1);
          }}
          isRefreshing={isRefreshing}
          accountLabel={state.phase === "ready" ? (state.data.account?.name ?? undefined) : undefined}
        />
        <DataSourceBadge source={source} />
      </div>

      {state.phase === "loading" && <AdvertisingLoadingPanel />}

      {state.phase === "error" && (
        <AdvertisingErrorPanel
          code={state.code}
          message={state.message}
          onRetry={() => {
            setState({ phase: "loading" });
            setRefreshTick((tick) => tick + 1);
          }}
        />
      )}

      {state.phase === "ready" && (
        <>
          <KpiCards metrics={totals} />
          {state.data.source === "mock" && <TrendChart data={dailyTrend} />}
          {state.data.source === "meta" && <MetaSalesNote />}

          {state.data.campaigns.length === 0 ? (
            <EmptyCampaignsPanel />
          ) : (
            <>
              <InsightsCallout campaignRows={campaignRows} />
              <PerformanceTable campaignRows={campaignRows} />
            </>
          )}
        </>
      )}
    </div>
  );
}
