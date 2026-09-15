"use client";

import { useEffect, useMemo, useState } from "react";

import { DashboardControls } from "@/components/dashboard/controls";
import { DataSourceBadge } from "@/components/dashboard/data-source-badge";
import { InsightsCallout } from "@/components/dashboard/insights-callout";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { MetaSalesNote } from "@/components/dashboard/meta-sales-note";
import { PerformanceTable } from "@/components/dashboard/performance-table";
import { FilterDropdown, type FilterOption } from "@/components/shared/filter-dropdown";
import { ApiErrorPanel, EmptyStatePanel, LoadingPanel } from "@/components/shared/status-panels";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { type CampaignRow, aggregateTotals, buildPerformanceTree } from "@/lib/aggregate";
import { presetDaysToDateRange } from "@/lib/advertising/date-range";
import { getInternalSalesTotals, INTERNAL_SALES_BASELINE_DAYS } from "@/lib/advertising/internal-sales";
import type { AdvertisingResult } from "@/lib/advertising";
import type { CampaignStatusMap } from "@/lib/campaign-status";
import { calcCloseRate, calcCostPerSale, calcROAS } from "@/lib/calculations";
import { DATE_RANGE_PRESETS, DEFAULT_DATE_RANGE_PRESET_ID } from "@/lib/constants";
import { dailyTrend } from "@/lib/mock-data";
import type { PerformanceMetrics } from "@/lib/types";

interface PageData {
  advertising: AdvertisingResult;
  campaignStatuses: CampaignStatusMap;
}

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; code: string; message: string }
  | { phase: "ready"; data: PageData };

const CAMPAIGN_STATUS_OPTIONS: FilterOption[] = [{ id: "active", label: "פעילים בלבד" }];

export default function DashboardPage() {
  const [presetId, setPresetId] = useState(DEFAULT_DATE_RANGE_PRESET_ID);
  const preset = DATE_RANGE_PRESETS.find((p) => p.id === presetId) ?? DATE_RANGE_PRESETS[2];
  const range = useMemo(() => presetDaysToDateRange(preset.days), [preset.days]);
  const rangeKey = `${range.since}_${range.until}`;

  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const [trackedRangeKey, setTrackedRangeKey] = useState(rangeKey);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  // Defaults to "active" (not null/"הכל") per spec - a fresh page load should
  // already be scoped to currently-active campaigns, not the account's
  // entire history.
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<"active" | null>("active");

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
        const [advertisingRes, campaignStatusRes] = await Promise.all([
          fetch(`/api/advertising?since=${range.since}&until=${range.until}`, { cache: "no-store" }),
          fetch(`/api/campaign-status`, { cache: "no-store" }),
        ]);
        if (cancelled) return;

        const [advertisingJson, campaignStatusJson] = await Promise.all([advertisingRes.json(), campaignStatusRes.json()]);
        if (cancelled) return;

        const failed = [
          { res: advertisingRes, json: advertisingJson },
          { res: campaignStatusRes, json: campaignStatusJson },
        ].find((entry) => !entry.res.ok || entry.json.error);
        if (failed) {
          setState({
            phase: "error",
            code: failed.json.error?.code ?? "unknown_error",
            message: failed.json.error?.message ?? "שגיאה לא צפויה בטעינת נתוני הפרסום.",
          });
          return;
        }

        setState({
          phase: "ready",
          data: {
            advertising: advertisingJson as AdvertisingResult,
            campaignStatuses: campaignStatusJson.statuses as CampaignStatusMap,
          },
        });
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

  const allCampaignRows = useMemo(
    () => (state.phase === "ready" ? buildPerformanceTree(state.data.advertising.campaigns) : []),
    [state]
  );
  const campaignStatuses = useMemo<CampaignStatusMap>(
    () => (state.phase === "ready" ? state.data.campaignStatuses : {}),
    [state]
  );

  // "Active Only" (the default) drops entire campaign subtrees (their Ad
  // Sets and Ads along with them) rather than deleting anything - a fresh
  // fetch with "הכל" selected shows the exact same historical data again.
  // Status comes from Meta's real effective_status by campaign ID (see
  // lib/campaign-status), never from campaign names.
  const campaignRows: CampaignRow[] = useMemo(() => {
    if (campaignStatusFilter !== "active") return allCampaignRows;
    return allCampaignRows.filter((campaign) => (campaignStatuses[campaign.id] ?? "ended") === "active");
  }, [allCampaignRows, campaignStatuses, campaignStatusFilter]);

  const source = state.phase === "ready" ? state.data.advertising.source : undefined;
  // Sales/Revenue/Close Rate/Cost per Sale/ROAS only ever come from the
  // internal/mock sales layer, which has no real attribution to live Meta
  // campaigns. In mock mode that cross-join is the whole point of the demo;
  // in Meta Live mode showing those mock numbers next to real spend/leads
  // would look like real performance, so they're left disconnected ("טרם
  // חובר") until a real sales-attribution source is wired up.
  const salesDataConnected = source !== "meta";

  const totals: PerformanceMetrics = useMemo(() => {
    const advTotals = aggregateTotals(campaignRows);
    if (!salesDataConnected) {
      return { ...advTotals, sales: 0, revenue: 0, closeRate: null, costPerSale: null, roas: null };
    }
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
  }, [campaignRows, preset.days, salesDataConnected]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <DashboardControls
            presetId={presetId}
            onPresetChange={setPresetId}
            onRefresh={() => {
              setIsRefreshing(true);
              setRefreshTick((tick) => tick + 1);
            }}
            isRefreshing={isRefreshing}
            accountLabel={state.phase === "ready" ? (state.data.advertising.account?.name ?? undefined) : undefined}
          />
          <FilterDropdown
            label="סטטוס קמפיין"
            options={CAMPAIGN_STATUS_OPTIONS}
            selectedId={campaignStatusFilter}
            onChange={(id) => setCampaignStatusFilter(id as "active" | null)}
          />
        </div>
        <DataSourceBadge source={source} />
      </div>

      {state.phase === "loading" && <LoadingPanel />}

      {state.phase === "error" && (
        <ApiErrorPanel
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
          <KpiCards metrics={totals} salesDataConnected={salesDataConnected} />
          {state.data.advertising.source === "mock" && <TrendChart data={dailyTrend} />}
          {state.data.advertising.source === "meta" && <MetaSalesNote />}

          {campaignRows.length === 0 ? (
            <EmptyStatePanel
              title="לא נמצאו קמפיינים"
              description={
                campaignStatusFilter === "active"
                  ? "אין קמפיינים פעילים בטווח התאריכים שנבחר - נסו לעבור לסינון 'הכל'."
                  : "לא נמצאו קמפיינים בטווח התאריכים שנבחר."
              }
            />
          ) : (
            <>
              <InsightsCallout campaignRows={campaignRows} />
              <PerformanceTable campaignRows={campaignRows} salesDataConnected={salesDataConnected} />
            </>
          )}
        </>
      )}
    </div>
  );
}
