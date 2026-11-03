"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CustomDateRangeSelect } from "@/components/shared/custom-date-range-select";
import { Button } from "@/components/ui/button";
import { ExposureTab } from "@/components/optimization/exposure-tab";
import { LeadsTab } from "@/components/optimization/leads-tab";
import { SonilTab } from "@/components/optimization/sonil-tab";
import { SummaryTab } from "@/components/optimization/summary-tab";
import { resolveDateRangeSelection, type DateRangeSelection } from "@/lib/advertising/date-range";
import { formatDateTimeInTimezone } from "@/lib/advertising/timezone";
import { DATE_RANGE_PRESETS } from "@/lib/constants";
import { formatIls } from "@/lib/optimization/format";
import { ACTION_STATUS_LABELS, type ActionStatus } from "@/lib/optimization/labels";
import type { Recommendation } from "@/lib/optimization/model";
import type { RunRecord, RunSummary } from "@/lib/optimization/run";
import { OPTIMIZATION_RULE_VERSION } from "@/lib/optimization/thresholds";

const TABS = [
  { id: "exposure", label: "חשיפה ותנועה" },
  { id: "leads", label: "לידים ומכירות" },
  { id: "sonil", label: "אופטימיזציית סוניל" },
  { id: "summary", label: "סיכום אופטימיזציה" },
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

  // On load: list the saved runs and open the most recent one. Reading only; no analysis starts here.
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
        if (list.length === 0) return;

        const openResponse = await fetch(`/api/optimization/runs/${encodeURIComponent(list[0].runId)}`, { cache: "no-store" });
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

  const rangeMismatch = record !== null && (record.selected.since !== range.since || record.selected.until !== range.until);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-heading">מרכז המלצות אופטימיזציה</h1>
        <p className="text-sm text-slate-600">
          ניתוח מבוסס כללים וחישובים בלבד. ללא AI. המערכת ממליצה בלבד: אין שינוי אוטומטי במטא. הניתוח רץ רק בלחיצה על &quot;הרץ ניתוח&quot;.
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <CustomDateRangeSelect selection={selection} onChange={setSelection} label="טווח תאריכים" />
        <Button onClick={runAnalysis} disabled={running}>
          {running ? "מנתח..." : "הרץ ניתוח"}
        </Button>
        {runs.length > 0 ? (
          <label className="flex min-w-0 flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-2">
            <span className="text-slate-600">דוח שמור</span>
            <select
              value={record?.runId ?? ""}
              onChange={(event) => void openRun(event.target.value)}
              className="w-full max-w-full rounded-md border border-slate-300 bg-white px-2 py-1 sm:w-auto"
            >
              {record && !runs.some((run) => run.runId === record.runId) ? (
                <option value={record.runId}>{formatDateTimeInTimezone(new Date(record.createdAt))}</option>
              ) : null}
              {runs.map((run) => (
                <option key={run.runId} value={run.runId}>
                  {formatDateTimeInTimezone(new Date(run.createdAt))} · {run.selected.since} עד {run.selected.until}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <span className="text-xs text-slate-500">
          {storage === "memory" ? "מצב דמו: הדוחות נשמרים בזיכרון התהליך בלבד" : "הדוחות נשמרים במסד הנתונים"}
        </span>
      </section>

      {error ? (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-900 ring-1 ring-red-200">
          {error}
        </p>
      ) : null}

      {rangeMismatch && record ? (
        <p className="rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-900 ring-1 ring-blue-200">
          הדוח המוצג מתייחס לטווח {record.selected.since} עד {record.selected.until}. הבורר מציג טווח אחר: לניתוח הטווח הזה לחצו &quot;הרץ ניתוח&quot;.
        </p>
      ) : null}

      {record ? (
        <>
          <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-xs text-slate-500">טווח הדוח</div>
              <div>
                {record.selected.since} עד {record.selected.until} ({record.selectedDays} ימים)
              </div>
              {record.selectedPartial ? <div className="text-xs text-orange-800">כולל יום חלקי</div> : null}
            </div>
            <div>
              <div className="text-xs text-slate-500">נתונים נקראו</div>
              <div>{formatDateTimeInTimezone(new Date(record.dataFetchedAt))}</div>
              <div className="text-xs text-slate-500">{record.dataSource === "demo" ? "מקור: נתוני דמו" : "מקור: Meta Ads"}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">השוואת מגמה</div>
              <div className="text-xs">{record.comparison.note}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">כללים</div>
              <div dir="ltr" className="font-mono text-xs">
                {record.ruleVersion}
              </div>
              <div className="text-xs text-slate-500">
                {record.output.recommendations.length} המלצות · {ACTION_STATUS_LABELS.pending} לפי ברירת מחדל
              </div>
            </div>
          </section>

          <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-700">
            <div>
              <span className="font-semibold">החרגה לפי Campaign ID בלבד: </span>
              {record.scope.exclusions.length > 0
                ? record.scope.exclusions.map((item) => `${item.name} (${item.id})`).join(", ")
                : "אין החרגות"}
              {" · "}
              הוצאה של קמפיינים מוחרגים בטווח: {formatIls(record.scope.excludedSpend)}
            </div>
            {record.scope.unlistedSpend !== null ? (
              <div>הוצאה ממודעות שלא הוחזרו ברשימה, בטווח: {formatIls(record.scope.unlistedSpend)}</div>
            ) : null}
            {record.output.notes.length > 0 ? (
              <ul className="list-disc space-y-0.5 pr-4 text-orange-900">
                {record.output.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}
          </section>

        </>
      ) : null}

      {/* The four tabs are always here, so the structure of the centre is visible before any run. */}
      <div role="tablist" aria-label="לשוניות מרכז האופטימיזציה" className="flex flex-wrap gap-2 border-b border-slate-200">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={
              tab === item.id
                ? "border-b-2 border-slate-900 px-3 py-2 text-sm font-semibold text-slate-900"
                : "border-b-2 border-transparent px-3 py-2 text-sm text-slate-600 hover:text-slate-900"
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {!record ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
            עדיין אין דוח שמור. בחרו טווח ולחצו &quot;הרץ ניתוח&quot;. שום ניתוח לא ירוץ לבד.
          </p>
        ) : null}
        {record && tab === "exposure" ? <ExposureTab record={record} /> : null}
        {record && tab === "leads" ? <LeadsTab record={record} /> : null}
        {record && tab === "sonil" ? <SonilTab record={record} /> : null}
        {record && tab === "summary" ? (
          <SummaryTab record={record} statuses={statuses} onStatus={setActionStatus} />
        ) : null}
      </div>

      {record ? (
        <p className="text-xs text-slate-500">
          גרסת כללים: <span dir="ltr" className="font-mono">{OPTIMIZATION_RULE_VERSION}</span>. הערכים בדוח נשמרו בזמן הניתוח ולא משתנים כשפותחים אותו.
        </p>
      ) : null}
    </div>
  );
}
