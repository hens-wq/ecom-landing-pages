"use client";

import { useEffect, useMemo, useState } from "react";

import { DashboardControls } from "@/components/dashboard/controls";
import { DataSourceBadge } from "@/components/dashboard/data-source-badge";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { PerformanceTable } from "@/components/dashboard/performance-table";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { DataQualityBanner, type QualityNotice } from "@/components/shared/data-quality-banner";
import { FilterDropdown, type FilterOption } from "@/components/shared/filter-dropdown";
import { ApiErrorPanel, EmptyStatePanel, LoadingPanel } from "@/components/shared/status-panels";
import { aggregateFlags, aggregateTotals, buildPerformanceTree, type CampaignRow } from "@/lib/aggregate";
import type { AdvertisingResult } from "@/lib/advertising";
import { resolveDateRangeSelection, type DateRangeSelection } from "@/lib/advertising/date-range";
import type { CampaignStatusMap } from "@/lib/campaign-status";
import { DATE_RANGE_PRESETS, DEFAULT_DATE_RANGE_PRESET_ID } from "@/lib/constants";
import { spendNotices } from "@/lib/performance/spend-notices";
import { dailyTrend } from "@/lib/mock-data";
import { attributeLeadFacts } from "@/lib/performance/attribution";
import { expandableRowIds } from "@/lib/performance/expansion";
import { filterVisibleCampaignRows } from "@/lib/performance/visible-rows";
import { sortCampaignRows, type SortKey, type SortState } from "@/lib/performance/sort";
import type { LeadFactsResult } from "@/lib/performance/types";

type LeadFactsState = { phase: "ok"; facts: LeadFactsResult } | { phase: "unavailable"; message: string };

interface PageData {
  advertising: AdvertisingResult;
  campaignStatuses: CampaignStatusMap;
  leadFacts: LeadFactsState;
}

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; code: string; message: string }
  | { phase: "ready"; data: PageData };

const CAMPAIGN_STATUS_OPTIONS: FilterOption[] = [{ id: "active", label: "פעילים בלבד" }];
const DEFAULT_SELECTION: DateRangeSelection = { presetId: DEFAULT_DATE_RANGE_PRESET_ID, customSince: null, customUntil: null };
/** Names and statuses open A-Z on the first click; every number opens highest-first. */
const TEXT_SORT_KEYS = new Set<SortKey>(["name", "status"]);

function nextSort(current: SortState | null, key: SortKey): SortState {
  if (current?.key === key) return { key, direction: current.direction === "asc" ? "desc" : "asc" };
  return { key, direction: TEXT_SORT_KEYS.has(key) ? "asc" : "desc" };
}

function toggleId(ids: Set<string>, id: string): Set<string> {
  const next = new Set(ids);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/** Plain-language notices for every lead figure that is missing or only partly covered. */
function leadNotices(leadFacts: LeadFactsState): QualityNotice[] {
  if (leadFacts.phase === "unavailable") {
    return [
      {
        tone: "error",
        text: `לידים ומכירות לא זמינים כרגע: ${leadFacts.message} מדדי הלידים, ה-CPL והמכירות מוצגים כ-"—" ולא כאפס.`,
      },
    ];
  }

  const { sources } = leadFacts.facts;
  const notices: QualityNotice[] = [];
  if (sources.meta.state === "unavailable") {
    notices.push({ tone: "error", text: `לידי Meta לא נטענו: ${sources.meta.message ?? "שגיאה לא ידועה."} מדדי הלידים מוצגים כ-"—".` });
  }
  if (sources.landing.state === "unavailable") {
    notices.push({ tone: "error", text: `לידים מדפי הנחיתה לא נטענו: ${sources.landing.message ?? "שגיאה לא ידועה."} מדדי הלידים מוצגים כ-"—".` });
  }
  if (sources.statuses.state === "unavailable") {
    notices.push({ tone: "error", text: `סטטוסי הלידים לא זמינים: ${sources.statuses.message ?? "שגיאה לא ידועה."} מכירות והכנסות מוצגות כ-"—".` });
  } else if (sources.statuses.state === "partial") {
    notices.push({
      tone: "warning",
      text: `סטטוס חסר ל-${sources.statuses.unknownCount} לידים. מכירות והכנסות שמסומנות "חלקי" מציגות רק את הלידים שנטענו.`,
    });
  }
  return notices;
}

export default function DashboardPage() {
  const [selection, setSelection] = useState<DateRangeSelection>(DEFAULT_SELECTION);
  const range = useMemo(() => resolveDateRangeSelection(selection, DATE_RANGE_PRESETS), [selection]);
  const rangeKey = `${range.since}_${range.until}`;

  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const [trackedRangeKey, setTrackedRangeKey] = useState(rangeKey);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  // Defaults to "active" - a fresh page load shows currently-active campaigns, not the account's entire history.
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<"active" | null>("active");
  const [sort, setSort] = useState<SortState | null>(null);
  // Kept on the page, not inside the table, so a refresh or a reload never closes what the user opened.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  // Reset to the loading state when the selected date range changes. This happens during render (React's documented
  // "adjust state when a prop changes" pattern), so a manual refresh never blanks the page.
  if (rangeKey !== trackedRangeKey) {
    setTrackedRangeKey(rangeKey);
    setState({ phase: "loading" });
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const [advertisingRes, campaignStatusRes, leadFactsRes] = await Promise.all([
          fetch(`/api/advertising?since=${range.since}&until=${range.until}`, { cache: "no-store" }),
          fetch(`/api/campaign-status`, { cache: "no-store" }),
          fetch(`/api/lead-facts?since=${range.since}&until=${range.until}`, { cache: "no-store" }),
        ]);
        if (cancelled) return;

        const [advertisingJson, campaignStatusJson, leadFactsJson] = await Promise.all([
          advertisingRes.json(),
          campaignStatusRes.json(),
          leadFactsRes.json().catch(() => null),
        ]);
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

        // Lead data is a separate request on purpose: when it fails, the spend and the campaign tree still show.
        const leadFacts: LeadFactsState =
          leadFactsRes.ok && leadFactsJson && !leadFactsJson.error
            ? { phase: "ok", facts: leadFactsJson as LeadFactsResult }
            : { phase: "unavailable", message: leadFactsJson?.error?.message ?? "לא ניתן היה לטעון לידים ומכירות כרגע." };

        setState({
          phase: "ready",
          data: {
            advertising: advertisingJson as AdvertisingResult,
            campaignStatuses: campaignStatusJson.statuses as CampaignStatusMap,
            leadFacts,
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

  const campaignStatuses = useMemo<CampaignStatusMap>(() => (state.phase === "ready" ? state.data.campaignStatuses : {}), [state]);

  // Lead figures are trusted only when both lead sources loaded. A partial lead set would make CPL and close rate look
  // better or worse than they are, so without it the lead figures show as unknown instead.
  const campaignTree = useMemo<CampaignRow[]>(() => {
    if (state.phase !== "ready") return [];
    const { advertising, leadFacts } = state.data;
    const facts = leadFacts.phase === "ok" ? leadFacts.facts : null;
    const leadsComplete = facts !== null && facts.sources.meta.state === "ok" && facts.sources.landing.state === "ok";
    const attribution = leadsComplete && facts ? attributeLeadFacts(advertising.campaigns, facts.leads) : undefined;
    return buildPerformanceTree(advertising.campaigns, attribution, advertising.unlisted);
  }, [state]);

  // "Active only" drops whole campaigns, and the campaign-less lead bucket with them. Paused ad sets and ads stay inside
  // an active campaign, because they may have had results in the selected range.
  const visibleRows = useMemo(
    () => filterVisibleCampaignRows(campaignTree, campaignStatuses, campaignStatusFilter === "active"),
    [campaignTree, campaignStatuses, campaignStatusFilter]
  );

  const sortedRows = useMemo(() => sortCampaignRows(visibleRows, sort), [visibleRows, sort]);
  const totals = useMemo(() => aggregateTotals(visibleRows), [visibleRows]);
  const flags = useMemo(() => aggregateFlags(visibleRows), [visibleRows]);
  const expandable = useMemo(() => expandableRowIds(sortedRows), [sortedRows]);
  const notices =
    state.phase === "ready"
      ? [
          ...leadNotices(state.data.leadFacts),
          ...spendNotices({
            reconciliation: state.data.advertising.reconciliation,
            unlistedSpend: state.data.advertising.unlisted?.spend ?? 0,
            isLive: state.data.advertising.source === "meta",
          }),
        ]
      : [];
  const reconciliationOk = state.phase === "ready" && state.data.advertising.reconciliation?.status === "ok";
  const spendCheck = state.phase === "ready" ? (state.data.advertising.reconciliation?.status ?? "none") : "none";
  const source = state.phase === "ready" ? state.data.advertising.source : undefined;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <DashboardControls
            selection={selection}
            onSelectionChange={setSelection}
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
        <div className="flex flex-wrap items-center gap-3">
          {reconciliationOk && <span className="text-xs font-medium text-emerald-700">ההוצאה מאומתת מול חשבון Meta</span>}
          <DataSourceBadge source={source} />
        </div>
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
          <DataQualityBanner notices={notices} />
          <KpiCards
            totals={totals}
            leadsKnown={flags.leadsKnown}
            unknownStatusLeads={flags.unknownStatusLeads}
            periodRange={range}
            spendCheck={spendCheck}
          />
          {state.data.advertising.source === "mock" && <TrendChart data={dailyTrend} />}

          {sortedRows.length === 0 ? (
            <EmptyStatePanel
              title="לא נמצאו קמפיינים"
              description={
                campaignStatusFilter === "active"
                  ? "אין קמפיינים פעילים בטווח התאריכים שנבחר - נסו לעבור לסינון 'הכל'."
                  : "לא נמצאו קמפיינים בטווח התאריכים שנבחר."
              }
            />
          ) : (
            <PerformanceTable
              rows={sortedRows}
              sort={sort}
              onSort={(key) => setSort((current) => nextSort(current, key))}
              expandedIds={expandedIds}
              onToggleExpand={(id) => setExpandedIds((current) => toggleId(current, id))}
              onExpandAll={() => setExpandedIds(new Set(expandable))}
              onCollapseAll={() => setExpandedIds(new Set())}
              hasExpandableRows={expandable.length > 0}
            />
          )}
        </>
      )}
    </div>
  );
}
