"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CustomDateRangeSelect } from "@/components/shared/custom-date-range-select";
import { Button } from "@/components/ui/button";
import { Bilingual } from "@/components/optimization/shared";
import { ExposureTab } from "@/components/optimization/exposure-tab";
import { LeadsTab } from "@/components/optimization/leads-tab";
import { SonilTab } from "@/components/optimization/sonil-tab";
import { SummaryTab } from "@/components/optimization/summary-tab";
import { CUSTOM_DATE_RANGE_PRESET_ID, resolveDateRangeSelection, type DateRangeSelection } from "@/lib/advertising/date-range";
import { DATE_RANGE_PRESETS } from "@/lib/constants";
import {
  CAMPAIGN_STATUS_FILTER_LABELS,
  CAMPAIGN_STATUS_FILTERS,
  DEFAULT_CAMPAIGN_STATUS_FILTER,
  campaignStatusesOf,
  inCampaignScope,
  type CampaignStatusFilter,
} from "@/lib/optimization/campaign-filter";
import { formatIls, formatRangeDmy, formatRunTimestamp } from "@/lib/optimization/format";
import type { ActionStatus } from "@/lib/optimization/labels";
import type { Recommendation } from "@/lib/optimization/model";
import { rangeStateOf } from "@/lib/optimization/range-state";
import type { RunRecord, RunSummary } from "@/lib/optimization/run";
import { OPTIMIZATION_RULE_VERSION } from "@/lib/optimization/thresholds";

const TABS = [
  { id: "exposure", en: "Exposure & Traffic", he: "חשיפה ותנועה" },
  { id: "leads", en: "Leads & Sales", he: "לידים ומכירות" },
  { id: "sonil", en: "Sunil Optimization", he: "אופטימיזציית סוניל" },
  { id: "summary", en: "Optimization Summary", he: "סיכום אופטימיזציה" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** The optimization centre opens on the last 7 days, as the spec asks. The date picker is shared by all four tabs. */
const DEFAULT_SELECTION: DateRangeSelection = { presetId: "last_7", customSince: "", customUntil: "" };

function errorMessageFrom(data: unknown, fallback: string): string {
  if (typeof data === "object" && data !== null && "error" in data) {
    const message = (data as { error?: { message?: unknown } }).error?.message;
    if (typeof message === "string") return message;
  }
  return fallback;
}

const JSON_HEADERS = { "Content-Type": "application/json" };

export function OptimizationCenter() {
  const [selection, setSelection] = useState<DateRangeSelection>(DEFAULT_SELECTION);
  const range = useMemo(() => resolveDateRangeSelection(selection, DATE_RANGE_PRESETS), [selection]);
  // The range the page opened on. The first read of the saved reports looks for a report of exactly this range.
  const openedRange = useRef(range);
  const [campaignStatus, setCampaignStatus] = useState<CampaignStatusFilter>(DEFAULT_CAMPAIGN_STATUS_FILTER);
  const [tab, setTab] = useState<TabId>("exposure");
  const [record, setRecord] = useState<RunRecord | null>(null);
  const [statuses, setStatuses] = useState<Record<string, ActionStatus>>({});
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [storage, setStorage] = useState<"memory" | "database" | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Lists saved runs. Reading the list never starts an analysis. */
  const refreshRuns = useCallback(async (): Promise<RunSummary[]> => {
    const response = await fetch("/api/optimization/runs", { cache: "no-store" });
    const data: unknown = await response.json();
    if (!response.ok) throw new Error(errorMessageFrom(data, "לא ניתן לטעון את רשימת הדוחות."));
    const body = data as { runs?: RunSummary[]; storage?: "memory" | "database" };
    setRuns(body.runs ?? []);
    setStorage(body.storage ?? null);
    return body.runs ?? [];
  }, []);

  /** Opens a saved report. Reading a report never starts a new analysis. */
  const openRun = useCallback(async (runId: string) => {
    setError(null);
    const response = await fetch(`/api/optimization/runs/${encodeURIComponent(runId)}`, { cache: "no-store" });
    const data: unknown = await response.json();
    if (!response.ok) {
      setError(errorMessageFrom(data, "לא ניתן לפתוח את הדוח."));
      return;
    }
    const body = data as { run: RunRecord; statuses: Record<string, ActionStatus> };
    setRecord(body.run);
    setStatuses(body.statuses);
  }, []);

  // On load: list the saved runs, and open the newest one only when it is for the range the page opened on. Reading only.
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const listResponse = await fetch("/api/optimization/runs", { cache: "no-store" });
        const listData: unknown = await listResponse.json();
        if (!listResponse.ok) throw new Error(errorMessageFrom(listData, "לא ניתן לטעון את רשימת הדוחות."));
        const listed = listData as { runs?: RunSummary[]; storage?: "memory" | "database" };
        const list = listed.runs ?? [];
        if (!active) return;
        setRuns(list);
        setStorage(listed.storage ?? null);
        const match = list.find((run) => rangeStateOf(run.selected, openedRange.current) === "current");
        if (!match) return;

        const openResponse = await fetch(`/api/optimization/runs/${encodeURIComponent(match.runId)}`, { cache: "no-store" });
        const openData: unknown = await openResponse.json();
        if (!active || !openResponse.ok) return;
        const opened = openData as { run: RunRecord; statuses: Record<string, ActionStatus> };
        setRecord(opened.run);
        setStatuses(opened.statuses);
      } catch {
        if (active) setError("לא ניתן לטעון את הדוחות השמורים כרגע.");
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  /** The only way a new analysis starts: this button, for the range now on the picker. */
  async function runAnalysis() {
    setRunning(true);
    setError(null);
    try {
      const response = await fetch("/api/optimization/runs", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ since: range.since, until: range.until }),
        cache: "no-store",
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        setError(errorMessageFrom(data, "הניתוח נכשל."));
        return;
      }
      setRecord((data as { run: RunRecord }).run);
      setStatuses({});
      await refreshRuns();
    } catch {
      setError("הניתוח נכשל: השרת לא החזיר תשובה.");
    } finally {
      setRunning(false);
    }
  }

  /** A saved report keeps its own range. Opening one also moves the picker to that range, so the two always agree. */
  function chooseSavedRun(run: RunSummary) {
    setSelection({ presetId: CUSTOM_DATE_RANGE_PRESET_ID, customSince: run.selected.since, customUntil: run.selected.until });
    void openRun(run.runId);
  }

  /** Documentation only: the status is saved, and nothing is sent to Meta. */
  async function setActionStatus(recommendation: Recommendation, status: ActionStatus) {
    if (!record) return;
    const previous = statuses;
    setStatuses({ ...statuses, [recommendation.id]: status });
    const response = await fetch(`/api/optimization/runs/${encodeURIComponent(record.runId)}/actions`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ recommendationId: recommendation.id, status }),
      cache: "no-store",
    });
    const data: unknown = await response.json();
    if (!response.ok) {
      setStatuses(previous);
      setError(errorMessageFrom(data, "שמירת הסטטוס נכשלה."));
      return;
    }
    setStatuses((data as { statuses: Record<string, ActionStatus> }).statuses);
  }

  // The report on screen is the one for the range now on the picker. Any other report is never presented as the answer.
  const reportState = rangeStateOf(record ? record.selected : null, range);
  const shown = reportState === "current" ? record : null;

  const campaignStatuses = useMemo(() => campaignStatusesOf(shown ? shown.output.entities : []), [shown]);
  const campaignOfUnit = useMemo(
    () => new Map((shown ? shown.output.entities : []).map((entity) => [entity.key, entity.campaignId] as const)),
    [shown]
  );
  /** Whether a unit of the report is in the campaign scope on screen. The Sonil comparison uses the same test. */
  const isInScope = (key: string): boolean => {
    const campaignId = campaignOfUnit.get(key);
    if (campaignId === undefined) return campaignStatus === "all";
    return inCampaignScope(campaignId, campaignStatuses, campaignStatus);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-heading">
          <Bilingual en="Optimization Recommendations Center" he="מרכז המלצות אופטימיזציה" />
        </h1>
        <p className="text-sm text-slate-600">
          ניתוח מבוסס כללים וחישובים בלבד. ללא AI. המערכת ממליצה בלבד: אין שינוי אוטומטי במטא. הניתוח רץ רק בלחיצה על &quot;הרץ ניתוח&quot;.
        </p>
      </header>

      <section aria-label="Run header" className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <CustomDateRangeSelect selection={selection} onChange={setSelection} label="Selected Date Range · טווח נבחר" />
          <label className="flex flex-col gap-1">
            <span className="font-medium text-slate-900">
              Campaign Status <span className="text-xs font-normal text-slate-500">· סטטוס קמפיין</span>
            </span>
            <select
              aria-label="Campaign Status"
              value={campaignStatus}
              onChange={(event) => setCampaignStatus(event.target.value as CampaignStatusFilter)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5"
            >
              {CAMPAIGN_STATUS_FILTERS.map((value) => (
                <option key={value} value={value}>
                  {CAMPAIGN_STATUS_FILTER_LABELS[value].en} · {CAMPAIGN_STATUS_FILTER_LABELS[value].he}
                </option>
              ))}
            </select>
          </label>
          <Button onClick={runAnalysis} disabled={running}>
            {running ? "מנתח..." : "הרץ ניתוח"}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xs font-medium text-slate-900">Last run · הרצה אחרונה</div>
            <div>{record ? formatRunTimestamp(record.createdAt) : "—"}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-900">Run Range · טווח הדוח</div>
            <div>
              {record ? `${formatRangeDmy(record.selected)} (${record.selectedDays === 1 ? "יום אחד" : `${record.selectedDays} ימים`})` : "—"}
            </div>
            {record?.selectedPartial ? <div className="text-xs text-orange-800">כולל יום חלקי</div> : null}
          </div>
          <div>
            <div className="text-xs font-medium text-slate-900">Data freshness · עדכון נתונים</div>
            <div>
              {record ? `${formatRunTimestamp(record.dataFetchedAt)} · ${record.dataSource === "demo" ? "נתוני דמו" : "Meta Ads"}` : "—"}
            </div>
          </div>
          {runs.length > 0 ? (
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-900">Saved report · דוח שמור</span>
              <select
                value={record?.runId ?? ""}
                onChange={(event) => {
                  const run = runs.find((item) => item.runId === event.target.value);
                  if (run) chooseSavedRun(run);
                }}
                className="w-full min-w-72 max-w-full rounded-md border border-slate-300 bg-white px-2 py-1"
              >
                {record && !runs.some((run) => run.runId === record.runId) ? (
                  <option value={record.runId}>{formatRunTimestamp(record.createdAt)}</option>
                ) : null}
                {runs.map((run) => (
                  <option key={run.runId} value={run.runId}>
                    {formatRunTimestamp(run.createdAt)} · {formatRangeDmy(run.selected)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        <span className="text-xs text-slate-500">
          {storage === "memory" ? "מצב דמו: הדוחות נשמרים בזיכרון התהליך בלבד" : "הדוחות נשמרים במסד הנתונים"}
        </span>
      </section>

      {error ? (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-900 ring-1 ring-red-200">
          {error}
        </p>
      ) : null}

      {reportState === "changed" ? (
        <p role="status" className="rounded-md bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900 ring-1 ring-blue-200">
          הטווח השתנה. יש להריץ ניתוח מחדש.
        </p>
      ) : null}

      {shown ? (
        <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-700">
          <div>
            <span className="font-semibold">החרגה לפי Campaign ID בלבד: </span>
            {shown.scope.exclusions.length > 0 ? shown.scope.exclusions.map((item) => `${item.name} (${item.id})`).join(", ") : "אין החרגות"}
            {" · "}
            הוצאה של קמפיינים מוחרגים בטווח: {formatIls(shown.scope.excludedSpend)}
          </div>
          {shown.scope.unlistedSpend !== null ? (
            <div>הוצאה ממודעות שלא הוחזרו ברשימה, בטווח: {formatIls(shown.scope.unlistedSpend)}</div>
          ) : null}
          <div>
            <span className="font-semibold">השוואת מגמה: </span>
            {shown.comparison.note}
          </div>
          <div>
            <span className="font-semibold">כללים: </span>
            <span dir="ltr" className="font-mono">{shown.ruleVersion}</span> · {shown.output.recommendations.length} המלצות בדוח
          </div>
          {shown.output.notes.length > 0 ? (
            <ul className="list-disc space-y-0.5 pr-4 text-orange-900">
              {shown.output.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {/* The four tabs are always here, so the structure of the centre is visible before any run. */}
      <div role="tablist" aria-label="Optimization tabs · לשוניות מרכז האופטימיזציה" className="flex flex-wrap gap-2 border-b border-slate-200">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={
              tab === item.id
                ? "border-b-2 border-slate-900 px-3 py-2 text-start text-sm font-semibold text-slate-900"
                : "border-b-2 border-transparent px-3 py-2 text-start text-sm text-slate-600 hover:text-slate-900"
            }
          >
            <Bilingual en={item.en} he={item.he} />
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {reportState === "none" ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
            עדיין אין דוח לטווח הזה. בחרו טווח ולחצו &quot;הרץ ניתוח&quot;. שום ניתוח לא ירוץ לבד.
          </p>
        ) : null}
        {shown && tab === "exposure" ? <ExposureTab record={shown} campaignStatus={campaignStatus} /> : null}
        {shown && tab === "leads" ? <LeadsTab record={shown} campaignStatus={campaignStatus} /> : null}
        {shown && tab === "sonil" ? <SonilTab runId={shown.runId} selected={shown.selected} isInScope={isInScope} /> : null}
        {shown && tab === "summary" ? (
          <SummaryTab record={shown} statuses={statuses} onStatus={setActionStatus} campaignStatus={campaignStatus} />
        ) : null}
      </div>

      {shown ? (
        <p className="text-xs text-slate-500">
          גרסת כללים: <span dir="ltr" className="font-mono">{OPTIMIZATION_RULE_VERSION}</span>. הערכים בדוח נשמרו בזמן הניתוח ולא משתנים כשפותחים אותו.
        </p>
      ) : null}
    </div>
  );
}
