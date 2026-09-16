"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Info, RefreshCw, Search, Undo2 } from "lucide-react";

import { DataSourceBadge } from "@/components/dashboard/data-source-badge";
import { DatabaseStatusBadge, type DatabaseStatus } from "@/components/leads/database-status-badge";
import { FilterDropdown, type FilterOption } from "@/components/shared/filter-dropdown";
import { LeadsTable } from "@/components/leads/leads-table";
import { SalesKpiCards } from "@/components/leads/sales-kpi-cards";
import { useLeadColumnWidths } from "@/components/leads/use-lead-column-widths";
import type { LeadStatusPatch } from "@/components/leads/use-lead-status-editor";
import { DateRangeSelect } from "@/components/shared/date-range-select";
import { ApiErrorPanel, EmptyStatePanel, LoadingPanel } from "@/components/shared/status-panels";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { type AdRow, type CampaignRow, buildPerformanceTree } from "@/lib/aggregate";
import type { AdvertisingResult } from "@/lib/advertising";
import type { CampaignStatusMap } from "@/lib/campaign-status";
import { DATE_RANGE_PRESETS, DEFAULT_DATE_RANGE_PRESET_ID, LEAD_SOURCE_LABELS } from "@/lib/constants";
import { calculateIrrelevantRate, calculateSalesSummary } from "@/lib/lead-status/calculations";
import { defaultLeadStatusRecord, MAIN_STATUSES, type LeadStatusRecord, type MainStatus } from "@/lib/lead-status/types";
import { buildNameLookup, landingLeadToMetaFormLead } from "@/lib/landing-leads/merge";
import type { LandingLeadRecord } from "@/lib/landing-leads/types";
import type { LeadsResult, MetaFormLead } from "@/lib/leads";
import { cn } from "@/lib/utils";

interface PageData {
  leadsResult: LeadsResult;
  campaignRows: CampaignRow[];
  statusesByLeadId: Map<string, LeadStatusRecord>;
  campaignStatuses: CampaignStatusMap;
}

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; code: string; message: string }
  | { phase: "ready"; data: PageData };

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function leadMatchesPhoneQuery(lead: MetaFormLead, query: string): boolean {
  const queryDigits = digitsOnly(query);
  if (!queryDigits) return true;
  const candidates = [lead.phone, lead.normalizedPhone].filter((v): v is string => Boolean(v));
  return candidates.some((phone) => digitsOnly(phone).includes(queryDigits));
}

function uniqueOptions(leads: MetaFormLead[], idKey: "campaignId" | "adSetId" | "adId", nameKey: "campaignName" | "adSetName" | "adName"): FilterOption[] {
  const seen = new Map<string, string>();
  for (const lead of leads) {
    const id = lead[idKey];
    if (!id || seen.has(id)) continue;
    seen.set(id, lead[nameKey] || id);
  }
  return Array.from(seen, ([id, label]) => ({ id, label }));
}

function flattenAdRows(campaignRows: CampaignRow[]): Array<{ campaignId: string; adSetId: string; ad: AdRow }> {
  const rows: Array<{ campaignId: string; adSetId: string; ad: AdRow }> = [];
  for (const campaign of campaignRows) {
    for (const adSet of campaign.adSets) {
      for (const ad of adSet.ads) rows.push({ campaignId: campaign.id, adSetId: adSet.id, ad });
    }
  }
  return rows;
}

/** Spend for whatever campaign/ad set/ad/campaign-status scope is currently selected - matched by ID only, exactly like the rest of this app's attribution. */
function sumScopedSpend(
  campaignRows: CampaignRow[],
  campaignStatuses: CampaignStatusMap,
  filters: { campaignId: string | null; adSetId: string | null; adId: string | null; campaignStatus: "active" | "inactive" | null }
): number {
  let total = 0;
  for (const { campaignId, adSetId, ad } of flattenAdRows(campaignRows)) {
    if (filters.campaignId && campaignId !== filters.campaignId) continue;
    if (filters.adSetId && adSetId !== filters.adSetId) continue;
    if (filters.adId && ad.id !== filters.adId) continue;
    if (filters.campaignStatus) {
      const isActive = (campaignStatuses[campaignId] ?? "ended") === "active";
      if (filters.campaignStatus === "active" && !isActive) continue;
      if (filters.campaignStatus === "inactive" && isActive) continue;
    }
    total += ad.metrics.spend;
  }
  return total;
}

const CAMPAIGN_STATUS_OPTIONS: FilterOption[] = [
  { id: "active", label: "פעילים בלבד" },
  { id: "inactive", label: "מושהים / לא פעילים" },
];

export default function LeadsPage() {
  const [presetId, setPresetId] = useState(DEFAULT_DATE_RANGE_PRESET_ID);
  const preset = DATE_RANGE_PRESETS.find((p) => p.id === presetId) ?? DATE_RANGE_PRESETS[0];
  const range = useMemo(() => preset.resolve(), [preset]);
  const rangeKey = `${range.since}_${range.until}`;

  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const [trackedRangeKey, setTrackedRangeKey] = useState(rangeKey);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const forceRefreshOnNextFetch = useRef(false);

  const [dbHealth, setDbHealth] = useState<{ status: DatabaseStatus; message?: string }>({ status: "checking" });

  const [phoneSearch, setPhoneSearch] = useState("");
  const [campaignFilter, setCampaignFilter] = useState<string | null>(null);
  const [adSetFilter, setAdSetFilter] = useState<string | null>(null);
  const [adFilter, setAdFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<"active" | "inactive" | null>(null);
  const [mainStatusFilter, setMainStatusFilter] = useState<MainStatus | null>(null);
  const [secondaryStatusFilter, setSecondaryStatusFilter] = useState<string | null>(null);

  if (rangeKey !== trackedRangeKey) {
    setTrackedRangeKey(rangeKey);
    setState({ phase: "loading" });
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const forceRefresh = forceRefreshOnNextFetch.current;
        forceRefreshOnNextFetch.current = false;
        const refreshParam = forceRefresh ? "&refresh=1" : "";

        const [leadsRes, advertisingRes, campaignStatusRes, landingLeadsRes] = await Promise.all([
          fetch(`/api/leads?since=${range.since}&until=${range.until}${refreshParam}`, { cache: "no-store" }),
          fetch(`/api/advertising?since=${range.since}&until=${range.until}`, { cache: "no-store" }),
          fetch(`/api/campaign-status`, { cache: "no-store" }),
          fetch(`/api/landing-leads?since=${range.since}&until=${range.until}`, { cache: "no-store" }),
        ]);
        if (cancelled) return;

        const [leadsJson, advertisingJson, campaignStatusJson, landingLeadsJson] = await Promise.all([
          leadsRes.json(),
          advertisingRes.json(),
          campaignStatusRes.json(),
          landingLeadsRes.json(),
        ]);
        if (cancelled) return;

        const failed = [
          { res: leadsRes, json: leadsJson },
          { res: advertisingRes, json: advertisingJson },
          { res: campaignStatusRes, json: campaignStatusJson },
          { res: landingLeadsRes, json: landingLeadsJson },
        ].find((entry) => !entry.res.ok || entry.json.error);
        if (failed) {
          setState({
            phase: "error",
            code: failed.json.error?.code ?? "unknown_error",
            message: failed.json.error?.message ?? "שגיאה לא צפויה בטעינת נתוני הלידים.",
          });
          return;
        }

        // Meta Instant Form leads keep being fetched live, exactly as
        // before; landing-page leads are the only ones persisted in Neon
        // (see lib/landing-leads) - combined here into one list so the rest
        // of this page (filters, KPI math, the table) never needs to know
        // leads came from two different places.
        const campaignRows = buildPerformanceTree((advertisingJson as AdvertisingResult).campaigns);
        const nameLookup = buildNameLookup(campaignRows);
        const landingLeads = (landingLeadsJson.leads as LandingLeadRecord[]).map((record) =>
          landingLeadToMetaFormLead(record, nameLookup)
        );
        const leadsResult: LeadsResult = {
          ...(leadsJson as LeadsResult),
          leads: [...(leadsJson as LeadsResult).leads, ...landingLeads].sort(
            (a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()
          ),
        };

        // Batch-load statuses only for the leads actually loaded for this
        // date range (not the whole table's history) - one query instead of
        // one per row. See api/lead-status/batch/route.ts. Landing-page
        // leads use their internalLeadId here exactly like a Meta lead uses
        // its meta_lead_id - lead_status's own schema/API never changed to
        // support this, since it was always a generic "whatever lead ID the
        // UI is showing" key, not a Meta-specific one.
        const statusRes = await fetch("/api/lead-status/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadIds: leadsResult.leads.map((lead) => lead.id) }),
        });
        if (cancelled) return;
        const statusJson = await statusRes.json();
        if (cancelled) return;
        if (!statusRes.ok || statusJson.error) {
          setState({
            phase: "error",
            code: "unknown_error",
            message: statusJson.error?.message ?? "שגיאה לא צפויה בטעינת סטטוסי הלידים ממסד הנתונים.",
          });
          return;
        }

        const statusesByLeadId = new Map<string, LeadStatusRecord>(
          (statusJson.records as LeadStatusRecord[]).map((record) => [record.leadId, record])
        );

        setState({
          phase: "ready",
          data: {
            leadsResult,
            campaignRows,
            statusesByLeadId,
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

  // Independent of the main data load - only drives the "מסד נתונים מחובר"
  // indicator, never blocks viewing leads (a save attempt will surface its
  // own clear error if the database turns out to be unavailable).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/lead-status/health", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { connected: boolean; message?: string }) => {
        if (cancelled) return;
        setDbHealth({ status: data.connected ? "connected" : "error", message: data.message });
      })
      .catch(() => {
        if (!cancelled) setDbHealth({ status: "error", message: "לא ניתן היה לבדוק את חיבור מסד הנתונים." });
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const allLeads = useMemo(() => (state.phase === "ready" ? state.data.leadsResult.leads : []), [state]);
  const source = state.phase === "ready" ? state.data.leadsResult.source : undefined;
  const statusesByLeadId = useMemo(() => (state.phase === "ready" ? state.data.statusesByLeadId : new Map<string, LeadStatusRecord>()), [state]);
  const campaignStatuses = useMemo(() => (state.phase === "ready" ? state.data.campaignStatuses : {}), [state]);
  const campaignRows = useMemo(() => (state.phase === "ready" ? state.data.campaignRows : []), [state]);

  const [statusOverrides, setStatusOverrides] = useState<Map<string, LeadStatusRecord>>(new Map());
  const effectiveStatusesByLeadId = useMemo(() => {
    if (statusOverrides.size === 0) return statusesByLeadId;
    const merged = new Map(statusesByLeadId);
    for (const [leadId, record] of statusOverrides) merged.set(leadId, record);
    return merged;
  }, [statusesByLeadId, statusOverrides]);

  function getStatus(leadId: string, normalizedPhone: string | null): LeadStatusRecord {
    return effectiveStatusesByLeadId.get(leadId) ?? defaultLeadStatusRecord(leadId, normalizedPhone);
  }

  async function saveLeadStatus(leadId: string, patch: LeadStatusPatch): Promise<LeadStatusRecord> {
    const response = await fetch("/api/lead-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, ...patch }),
    });
    const json = await response.json();
    if (!response.ok || json.error) {
      throw new Error(json.error?.message ?? "שגיאה לא צפויה בשמירת הסטטוס.");
    }
    return json.record as LeadStatusRecord;
  }

  function handleStatusSaved(record: LeadStatusRecord) {
    setStatusOverrides((prev) => {
      const next = new Map(prev);
      next.set(record.leadId, record);
      return next;
    });
  }

  const campaignOptions = useMemo(() => uniqueOptions(allLeads, "campaignId", "campaignName"), [allLeads]);
  const adSetOptions = useMemo(
    () => uniqueOptions(allLeads.filter((l) => !campaignFilter || l.campaignId === campaignFilter), "adSetId", "adSetName"),
    [allLeads, campaignFilter]
  );
  const adOptions = useMemo(
    () =>
      uniqueOptions(
        allLeads.filter((l) => (!campaignFilter || l.campaignId === campaignFilter) && (!adSetFilter || l.adSetId === adSetFilter)),
        "adId",
        "adName"
      ),
    [allLeads, campaignFilter, adSetFilter]
  );
  const sourceOptions = useMemo<FilterOption[]>(() => {
    const seen = new Set<string>();
    for (const lead of allLeads) seen.add(lead.sourceType);
    return Array.from(seen, (sourceType) => ({ id: sourceType, label: LEAD_SOURCE_LABELS[sourceType as keyof typeof LEAD_SOURCE_LABELS].short }));
  }, [allLeads]);
  const mainStatusOptions = useMemo<FilterOption[]>(() => MAIN_STATUSES.map((status) => ({ id: status, label: status })), []);

  // "Scoped" leads: date range + campaign/ad set/ad/source/campaign-status
  // filters, but deliberately NOT the main/secondary status filters - those
  // are how a marketer *views* a subset, not a change to what "Total Leads"
  // means for the KPI cards' rate denominators below.
  const scopedLeads = useMemo(() => {
    return allLeads.filter((lead) => {
      if (campaignFilter && lead.campaignId !== campaignFilter) return false;
      if (adSetFilter && lead.adSetId !== adSetFilter) return false;
      if (adFilter && lead.adId !== adFilter) return false;
      if (sourceFilter && lead.sourceType !== sourceFilter) return false;
      if (campaignStatusFilter) {
        const isActive = (campaignStatuses[lead.campaignId] ?? "ended") === "active";
        if (campaignStatusFilter === "active" && !isActive) return false;
        if (campaignStatusFilter === "inactive" && isActive) return false;
      }
      return true;
    });
  }, [allLeads, campaignFilter, adSetFilter, adFilter, sourceFilter, campaignStatusFilter, campaignStatuses]);

  const secondaryStatusOptions = useMemo<FilterOption[]>(() => {
    const present = new Set<string>();
    for (const lead of scopedLeads) {
      const record = getStatus(lead.id, lead.normalizedPhone);
      if (!mainStatusFilter || record.mainStatus === mainStatusFilter) present.add(record.secondaryStatus);
    }
    return Array.from(present, (status) => ({ id: status, label: status }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getStatus closes over effectiveStatusesByLeadId, already a dependency via statusOverrides/statusesByLeadId below
  }, [scopedLeads, mainStatusFilter, effectiveStatusesByLeadId]);

  const filteredLeads = useMemo(() => {
    return scopedLeads.filter((lead) => {
      const record = getStatus(lead.id, lead.normalizedPhone);
      if (mainStatusFilter && record.mainStatus !== mainStatusFilter) return false;
      if (secondaryStatusFilter && record.secondaryStatus !== secondaryStatusFilter) return false;
      return leadMatchesPhoneQuery(lead, phoneSearch);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedLeads, mainStatusFilter, secondaryStatusFilter, phoneSearch, effectiveStatusesByLeadId]);

  const scopedSpend = useMemo(
    () =>
      sumScopedSpend(campaignRows, campaignStatuses, {
        campaignId: campaignFilter,
        adSetId: adSetFilter,
        adId: adFilter,
        campaignStatus: campaignStatusFilter,
      }),
    [campaignRows, campaignStatuses, campaignFilter, adSetFilter, adFilter, campaignStatusFilter]
  );

  const salesSummary = useMemo(
    () => calculateSalesSummary(scopedLeads.map((l) => l.id), effectiveStatusesByLeadId, scopedSpend),
    [scopedLeads, effectiveStatusesByLeadId, scopedSpend]
  );
  const irrelevantRate = useMemo(
    () => calculateIrrelevantRate(scopedLeads.map((l) => l.id), effectiveStatusesByLeadId),
    [scopedLeads, effectiveStatusesByLeadId]
  );

  const hasActiveFilters = Boolean(
    campaignFilter || adSetFilter || adFilter || sourceFilter || campaignStatusFilter || mainStatusFilter || secondaryStatusFilter || phoneSearch.trim()
  );

  const columnWidths = useLeadColumnWidths(filteredLeads);

  return (
    <div className="flex flex-col gap-5">
      {dbHealth.status === "error" && <DatabaseStatusBadge status={dbHealth.status} message={dbHealth.message} />}

      <Card className="border-primary/25 bg-primary/[0.035]">
        <CardContent className="flex gap-3 px-5 py-4 text-sm leading-relaxed">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-muted-foreground">
            עמוד זה מציג לידים מ<span className="font-medium text-foreground">טפסי Meta (Instant Forms)</span> ומ
            <span className="font-medium text-foreground">דפי נחיתה</span> יחד, עם שיוך מלא לקמפיין ← סדרת מודעות ← מודעה
            לפי מזהים, וניהול סטטוס מכירה פנימי של Ecom.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeSelect presetId={presetId} onPresetChange={setPresetId} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              forceRefreshOnNextFetch.current = true;
              setIsRefreshing(true);
              setRefreshTick((tick) => tick + 1);
            }}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
            {isRefreshing ? "מרענן..." : "רענון נתונים"}
          </Button>
          {columnWidths.hasCustomWidths && (
            <Button variant="ghost" size="sm" onClick={columnWidths.resetWidths} className="gap-2">
              <Undo2 className="size-4" />
              איפוס תצוגת עמודות
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {dbHealth.status === "connected" && <DatabaseStatusBadge status={dbHealth.status} />}
          <DataSourceBadge source={source} />
        </div>
      </div>

      {state.phase === "loading" && <LoadingPanel label="טוען לידים..." />}

      {state.phase === "error" && (
        <ApiErrorPanel
          title="לא ניתן היה לטעון נתוני לידים"
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
          <SalesKpiCards sales={salesSummary} irrelevant={irrelevantRate} />

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                placeholder="חיפוש לפי מספר טלפון..."
                className="w-56 pr-8"
                dir="ltr"
              />
            </div>
            <FilterDropdown
              label="קמפיין"
              options={campaignOptions}
              selectedId={campaignFilter}
              onChange={(id) => {
                setCampaignFilter(id);
                setAdSetFilter(null);
                setAdFilter(null);
              }}
            />
            <FilterDropdown
              label="סדרת מודעות"
              options={adSetOptions}
              selectedId={adSetFilter}
              onChange={(id) => {
                setAdSetFilter(id);
                setAdFilter(null);
              }}
            />
            <FilterDropdown label="מודעה" options={adOptions} selectedId={adFilter} onChange={setAdFilter} />
            <FilterDropdown label="מקור ליד" options={sourceOptions} selectedId={sourceFilter} onChange={setSourceFilter} />
            <FilterDropdown
              label="סטטוס קמפיין"
              options={CAMPAIGN_STATUS_OPTIONS}
              selectedId={campaignStatusFilter}
              onChange={(id) => setCampaignStatusFilter(id as "active" | "inactive" | null)}
            />
            <FilterDropdown
              label="סטטוס ראשי"
              options={mainStatusOptions}
              selectedId={mainStatusFilter}
              onChange={(id) => {
                setMainStatusFilter(id as MainStatus | null);
                setSecondaryStatusFilter(null);
              }}
            />
            <FilterDropdown
              label="סטטוס משני"
              options={secondaryStatusOptions}
              selectedId={secondaryStatusFilter}
              onChange={setSecondaryStatusFilter}
            />
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPhoneSearch("");
                  setCampaignFilter(null);
                  setAdSetFilter(null);
                  setAdFilter(null);
                  setSourceFilter(null);
                  setCampaignStatusFilter(null);
                  setMainStatusFilter(null);
                  setSecondaryStatusFilter(null);
                }}
              >
                איפוס סינון
              </Button>
            )}
            <span className="text-xs text-muted-foreground">
              מציג {filteredLeads.length.toLocaleString("he-IL")} מתוך {allLeads.length.toLocaleString("he-IL")} לידים
            </span>
          </div>

          {allLeads.length === 0 ? (
            <EmptyStatePanel title="לא נמצאו לידים" description="לא נמצאו לידים בטווח התאריכים שנבחר." />
          ) : filteredLeads.length === 0 ? (
            <EmptyStatePanel title="לא נמצאו לידים התואמים לסינון" description="נסו לשנות את החיפוש, המסננים או טווח התאריכים." />
          ) : (
            <LeadsTable
              leads={filteredLeads}
              statusesByLeadId={effectiveStatusesByLeadId}
              onSaveStatus={saveLeadStatus}
              onStatusSaved={handleStatusSaved}
              columnWidths={columnWidths}
            />
          )}
        </>
      )}
    </div>
  );
}
