"use client";

import { useEffect, useMemo, useState } from "react";
import { Info, RefreshCw, Search } from "lucide-react";

import { DataSourceBadge } from "@/components/dashboard/data-source-badge";
import { FilterDropdown, type FilterOption } from "@/components/leads/filter-dropdown";
import { LeadsTable } from "@/components/leads/leads-table";
import { DateRangeSelect } from "@/components/shared/date-range-select";
import { ApiErrorPanel, EmptyStatePanel, LoadingPanel } from "@/components/shared/status-panels";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { presetDaysToDateRange } from "@/lib/advertising/date-range";
import { DATE_RANGE_PRESETS, DEFAULT_DATE_RANGE_PRESET_ID, LEAD_SOURCE_LABELS } from "@/lib/constants";
import type { LeadsResult, MetaFormLead } from "@/lib/leads";
import { cn } from "@/lib/utils";

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; code: string; message: string }
  | { phase: "ready"; data: LeadsResult };

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

export default function LeadsPage() {
  const [presetId, setPresetId] = useState(DEFAULT_DATE_RANGE_PRESET_ID);
  const preset = DATE_RANGE_PRESETS.find((p) => p.id === presetId) ?? DATE_RANGE_PRESETS[2];
  const range = useMemo(() => presetDaysToDateRange(preset.days), [preset.days]);
  const rangeKey = `${range.since}_${range.until}`;

  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const [trackedRangeKey, setTrackedRangeKey] = useState(rangeKey);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const [phoneSearch, setPhoneSearch] = useState("");
  const [campaignFilter, setCampaignFilter] = useState<string | null>(null);
  const [adSetFilter, setAdSetFilter] = useState<string | null>(null);
  const [adFilter, setAdFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);

  // Same "adjust state during render" pattern as the Dashboard page - resets
  // the loading state when the date range changes without blanking the page
  // on a manual refresh (which doesn't touch the range).
  if (rangeKey !== trackedRangeKey) {
    setTrackedRangeKey(rangeKey);
    setState({ phase: "loading" });
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const response = await fetch(`/api/leads?since=${range.since}&until=${range.until}`, { cache: "no-store" });
        const json = await response.json();
        if (cancelled) return;

        if (!response.ok || json.error) {
          setState({
            phase: "error",
            code: json.error?.code ?? "unknown_error",
            message: json.error?.message ?? "שגיאה לא צפויה בטעינת הלידים.",
          });
          return;
        }
        setState({ phase: "ready", data: json as LeadsResult });
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

  const allLeads = useMemo(() => (state.phase === "ready" ? state.data.leads : []), [state]);
  const source = state.phase === "ready" ? state.data.source : undefined;

  // Filter options cascade: Ad Set options are scoped to the selected
  // Campaign, Ad options to the selected Ad Set (or Campaign, if no Ad Set is
  // selected yet) - so a marketer narrowing down never sees irrelevant names.
  const campaignOptions = useMemo(() => uniqueOptions(allLeads, "campaignId", "campaignName"), [allLeads]);
  const adSetOptions = useMemo(
    () => uniqueOptions(allLeads.filter((l) => !campaignFilter || l.campaignId === campaignFilter), "adSetId", "adSetName"),
    [allLeads, campaignFilter]
  );
  const adOptions = useMemo(
    () =>
      uniqueOptions(
        allLeads.filter(
          (l) => (!campaignFilter || l.campaignId === campaignFilter) && (!adSetFilter || l.adSetId === adSetFilter)
        ),
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

  const filteredLeads = useMemo(() => {
    return allLeads.filter(
      (lead) =>
        (!campaignFilter || lead.campaignId === campaignFilter) &&
        (!adSetFilter || lead.adSetId === adSetFilter) &&
        (!adFilter || lead.adId === adFilter) &&
        (!sourceFilter || lead.sourceType === sourceFilter) &&
        leadMatchesPhoneQuery(lead, phoneSearch)
    );
  }, [allLeads, campaignFilter, adSetFilter, adFilter, sourceFilter, phoneSearch]);

  const hasActiveFilters = Boolean(campaignFilter || adSetFilter || adFilter || sourceFilter || phoneSearch.trim());

  return (
    <div className="flex flex-col gap-5">
      <Card className="border-primary/25 bg-primary/[0.035]">
        <CardContent className="flex gap-3 px-5 py-4 text-sm leading-relaxed">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-muted-foreground">
            עמוד זה מציג לידים שהתקבלו דרך <span className="font-medium text-foreground">טפסי Meta (Instant Forms)</span> בלבד,
            עם שיוך מלא לקמפיין ← סדרת מודעות ← מודעה לפי מזהים. לידים מדפי נחיתה עדיין אינם כלולים כאן - שיוך שלהם
            ייבנה בנפרד בשלב הבא.
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
              setIsRefreshing(true);
              setRefreshTick((tick) => tick + 1);
            }}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} />
            {isRefreshing ? "מרענן..." : "רענון נתונים"}
          </Button>
        </div>
        <DataSourceBadge source={source} />
      </div>

      {state.phase === "loading" && <LoadingPanel label="טוען לידים..." />}

      {state.phase === "error" && (
        <ApiErrorPanel
          title="לא ניתן היה לטעון לידים מ-Meta"
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
            <LeadsTable leads={filteredLeads} />
          )}
        </>
      )}
    </div>
  );
}
