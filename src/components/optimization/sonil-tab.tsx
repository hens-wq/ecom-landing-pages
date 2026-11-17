"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ToneBadge } from "@/components/optimization/shared";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bilingual } from "@/components/optimization/shared";
import { ACTION_CODES, ACTION_LABELS, LEVEL_LABELS, type Tone } from "@/lib/optimization/labels";
import type { SonilChecks } from "@/lib/optimization/sonil/checks";
import { OUTCOME_LABELS, type SonilComparisonRow, type SonilOutcome } from "@/lib/optimization/sonil/compare";
import {
  MAPPING_ROLES,
  ROLE_LABELS,
  emptyMapping,
  mappingProblems,
  type SonilMapping,
  type ValueAction,
  type ValueMap,
} from "@/lib/optimization/sonil/mapping";
import type { SonilLatest, SonilPreview } from "@/lib/optimization/sonil/types";

const OUTCOME_TONE: Record<SonilOutcome, Tone> = { agreement: "positive", disagreement: "problem", data_gap: "insufficient" };
const FILTERS: Array<{ value: "all" | SonilOutcome; label: string }> = [
  { value: "all", label: "הכול" },
  { value: "disagreement", label: OUTCOME_LABELS.disagreement },
  { value: "data_gap", label: OUTCOME_LABELS.data_gap },
  { value: "agreement", label: OUTCOME_LABELS.agreement },
];
const SHOWN_PROBLEMS = 20;
const NO_ROWS: SonilComparisonRow[] = [];

interface DateRangeView {
  since: string;
  until: string;
}

function shortDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

/** Sends the file and, when given, the mapping, to the Sonil endpoints. Throws with the server's Hebrew message on failure. */
async function sendSonil(runId: string, path: "" | "/preview", file: File, mapping?: SonilMapping, valueMap?: ValueMap) {
  const form = new FormData();
  form.append("file", file);
  if (mapping) form.append("mapping", JSON.stringify(mapping));
  if (valueMap) form.append("valueMap", JSON.stringify(valueMap));
  const response = await fetch(`/api/optimization/runs/${encodeURIComponent(runId)}/sonil${path}`, { method: "POST", body: form });
  const body = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message ?? "השליחה לא הצליחה. נסו שוב.");
  return body;
}

/**
 * Compares Sonil's report with our own recommendations for the same run. It is a comparison only: our recommendations are
 * shown as saved, and nothing in the uploaded file changes them.
 */
export function SonilTab({
  runId,
  selected,
  isInScope,
}: {
  runId: string;
  selected: DateRangeView;
  /** Whether a unit of the saved report is in the campaign scope on screen (the same Campaign Status filter as the other tabs). */
  isInScope: (key: string) => boolean;
}) {
  const [saved, setSaved] = useState<SonilLatest | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<SonilPreview | null>(null);
  const [mapping, setMapping] = useState<SonilMapping>(emptyMapping);
  const [valueMap, setValueMap] = useState<ValueMap>({});
  const [checked, setChecked] = useState<SonilPreview | null>(null);
  // A change after the last check: the check still shows, but saving waits for a new check.
  const [stale, setStale] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | SonilOutcome>("all");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reading the saved report starts nothing. It only shows what was saved against this run.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(`/api/optimization/runs/${encodeURIComponent(runId)}/sonil`, { cache: "no-store" });
        const body = (await response.json()) as SonilLatest | { error?: { message?: string } };
        if (cancelled) return;
        if (!response.ok) {
          setLoadError((body as { error?: { message?: string } }).error?.message ?? "לא ניתן לטעון את דוח סוניל השמור.");
          return;
        }
        setSaved(body as SonilLatest);
        setLoadError(null);
      } catch {
        if (!cancelled) setLoadError("לא ניתן לטעון את דוח סוניל השמור.");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [runId]);

  const problems = useMemo(() => (preview ? mappingProblems(mapping, preview.columns.length) : []), [mapping, preview]);
  const shown: SonilChecks | null = checked?.checks ?? null;
  const rows: SonilComparisonRow[] = useMemo(() => checked?.comparison ?? saved?.comparison ?? NO_ROWS, [checked, saved]);
  const visible = useMemo(() => rows.filter((row) => filter === "all" || row.outcome === filter), [rows, filter]);
  const counts = useMemo(
    () => ({
      agreement: rows.filter((row) => row.outcome === "agreement").length,
      disagreement: rows.filter((row) => row.outcome === "disagreement").length,
      data_gap: rows.filter((row) => row.outcome === "data_gap").length,
    }),
    [rows]
  );
  const showingDraft = checked !== null;
  const activeSave = saved?.import ?? null;
  const canSave = showingDraft && !stale && problems.length === 0 && !busy;

  function resetDraft(): void {
    setFile(null);
    setPreview(null);
    setMapping(emptyMapping());
    setValueMap({});
    setChecked(null);
    setStale(false);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function onPickFile(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const picked = event.target.files?.[0] ?? null;
    resetDraft();
    if (!picked) return;
    setFile(picked);
    setBusy(true);
    try {
      setPreview((await sendSonil(runId, "/preview", picked)) as SonilPreview);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "הקובץ לא נקרא.");
      setFile(null);
    } finally {
      setBusy(false);
    }
  }

  async function onCheck(): Promise<void> {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setChecked((await sendSonil(runId, "/preview", file, mapping, valueMap)) as SonilPreview);
      setStale(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "הבדיקה לא הצליחה.");
    } finally {
      setBusy(false);
    }
  }

  async function onSave(): Promise<void> {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const body = (await sendSonil(runId, "", file, mapping, valueMap)) as { import: SonilLatest["import"]; comparison: SonilComparisonRow[] };
      setSaved({ import: body.import, comparison: body.comparison });
      resetDraft();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "השמירה לא הצליחה.");
    } finally {
      setBusy(false);
    }
  }

  function setRole(role: (typeof MAPPING_ROLES)[number], value: string): void {
    setMapping({ ...mapping, [role]: value === "" ? null : Number(value) });
    setStale(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <strong>אופטימיזציית סוניל היא לשונית השוואה בלבד.</strong> ההמלצה העצמאית של המערכת נשמרה בזמן הניתוח, ואינה משתנה לפי
        דוח סוניל. טווח הניתוח: {shortDate(selected.since)}–{shortDate(selected.until)}.
      </div>

      <section className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900">העלאת דוח סוניל</h3>
        <p className="text-xs text-slate-500">
          קובץ XLSX או CSV, עד 4 MB. מזהים נקראים כטקסט בלבד, לפי ID, לעולם לא לפי שם. בלי הכנה ידנית של JSON.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv"
          onChange={onPickFile}
          disabled={busy}
          className="text-sm"
          aria-label="קובץ דוח סוניל"
        />
        {busy ? <p className="text-xs text-slate-500">עובד…</p> : null}
        {error ? (
          <p role="alert" className="text-sm text-red-800">
            {error}
          </p>
        ) : null}
        {loadError ? <p className="text-sm text-red-800">{loadError}</p> : null}

        {preview ? (
          <div className="flex flex-col gap-3 border-t border-slate-200 pt-3">
            <div className="text-xs text-slate-600">
              {preview.file.name} · {preview.file.format.toUpperCase()}
              {preview.file.sheetName ? ` · גיליון "${preview.file.sheetName}"` : ""}
              {preview.file.encoding ? ` · קידוד ${preview.file.encoding}` : ""}
              {preview.file.delimiter ? ` · מפריד "${preview.file.delimiter === "\t" ? "טאב" : preview.file.delimiter}"` : ""} ·{" "}
              {preview.file.rowCount} שורות נתונים
            </div>
            {preview.file.warnings.map((warning) => (
              <p key={warning} className="text-xs text-orange-800">
                {warning}
              </p>
            ))}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>עמודה</TableHead>
                    <TableHead>מה יש בה (לפי התוכן)</TableHead>
                    <TableHead>דוגמאות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.columns.map((column) => (
                    <TableRow key={column.index}>
                      <TableCell>
                        {column.index + 1}. {column.header}
                      </TableCell>
                      <TableCell>
                        {column.hint}
                        {column.roundedNumbers > 0 ? (
                          <span className="block text-xs text-red-800">{column.roundedNumbers} מספרים מעוגלים ב-Excel</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{column.samples.join(" · ")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {MAPPING_ROLES.map((role) => (
                <div key={role} className="flex flex-col gap-1 text-xs text-slate-700">
                  <label htmlFor={`sonil-role-${role}`}>{ROLE_LABELS[role]}</label>
                  <select
                    id={`sonil-role-${role}`}
                    value={mapping[role] ?? ""}
                    onChange={(event) => setRole(role, event.target.value)}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                  >
                    <option value="">— לא ממופה —</option>
                    {preview.columns.map((column) => (
                      <option key={column.index} value={column.index}>
                        {column.index + 1}. {column.header} ({column.hint})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {problems.length > 0 ? (
              <ul className="list-disc pr-5 text-xs text-red-800">
                {problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onCheck}
                disabled={busy || problems.length > 0}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                בדיקה והשוואה (לא נשמר)
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={!canSave}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
              >
                שמירה והשוואה
              </button>
            </div>

            {shown ? (
              <ValueMapping
                values={shown.recommendationValues.map((value) => value.text)}
                valueMap={valueMap}
                onChange={(text, value) => {
                  const next: ValueMap = { ...valueMap };
                  if (value === "") delete next[text];
                  else next[text] = value as ValueAction;
                  setValueMap(next);
                  setStale(true);
                }}
              />
            ) : null}
            {showingDraft && stale ? (
              <p className="text-xs text-orange-800">המיפוי השתנה מאז הבדיקה. בדקו שוב לפני השמירה.</p>
            ) : null}
          </div>
        ) : null}
      </section>

      {shown ? <ChecksPanel checks={shown} draft /> : activeSave ? <ChecksPanel checks={activeSave.checks} draft={false} /> : null}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">
            {showingDraft ? "השוואה לפני שמירה" : activeSave ? "השוואה שנשמרה" : "אין דוח סוניל שמור לטווח הזה"}
          </h3>
          {rows.length > 0 ? (
            <span className="text-xs text-slate-500">
              {counts.agreement} הסכמה · {counts.disagreement} מחלוקת · {counts.data_gap} פער בנתונים
            </span>
          ) : null}
        </div>
        {rows.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                aria-pressed={filter === item.value}
                className={`rounded-md px-2.5 py-1 text-xs ring-1 ring-inset ${
                  filter === item.value ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-700 ring-slate-300"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><Bilingual en="Unit" he="יחידה" /></TableHead>
                  <TableHead><Bilingual en="Our recommendation" he="המלצת המערכת שלנו" /></TableHead>
                  <TableHead><Bilingual en="Sonil recommendation" he="המלצת סוניל" /></TableHead>
                  <TableHead><Bilingual en="Result" he="תוצאה" /></TableHead>
                  <TableHead><Bilingual en="Suggested check" he="פעולה מוצעת לבדיקה" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.filter((row) => isInScope(row.key)).map((row) => (
                  <ComparisonRow key={row.key} row={row} />
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            {saved === null ? "טוען…" : "העלו דוח סוניל ובדקו את המיפוי כדי לראות את ההשוואה."}
          </p>
        )}
      </section>
    </div>
  );
}

function ValueMapping({
  values,
  valueMap,
  onChange,
}: {
  values: string[];
  valueMap: ValueMap;
  onChange: (text: string, action: string) => void;
}) {
  if (values.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-xs font-semibold text-slate-900">מיפוי ערכי ההמלצה של סוניל לפעולות</h4>
      <p className="text-xs text-slate-500">כל ערך שמופיע בקובץ צריך לקבל פעולה. ערך לא ממופה נחשב פער בנתונים, ולא מושווה.</p>
      {values.map((text, index) => (
        <div key={text} className="flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor={`sonil-value-${index}`} className="min-w-40 font-medium text-slate-800">
            &quot;{text}&quot;
          </label>
          <select
            id={`sonil-value-${index}`}
            value={valueMap[text] ?? ""}
            onChange={(event) => onChange(text, event.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
          >
            <option value="">— לא ממופה —</option>
            <option value="unmapped">לא מופה (פער)</option>
            {ACTION_CODES.map((code) => (
              <option key={code} value={code}>
                {ACTION_LABELS[code]}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

function ChecksPanel({ checks, draft }: { checks: SonilChecks; draft: boolean }) {
  return (
    <section className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-4 text-sm">
      <div className="text-xs text-slate-600">
        {draft ? "בדיקה לפני שמירה" : "בדיקה שנשמרה"}: {checks.rowCount} שורות · {checks.matchedRows} הותאמו לפי ID ·{" "}
        {checks.unmatchedRows} לא הותאמו
        {checks.fileDates ? ` · תאריכים בקובץ ${shortDate(checks.fileDates.since)}–${shortDate(checks.fileDates.until)}` : ""}
      </div>
      {checks.warnings.length === 0 ? (
        <p className="text-xs text-emerald-800">אין אזהרות על הקובץ מול הנתונים שלנו.</p>
      ) : (
        <ul className="list-disc pr-5 text-xs text-orange-900">
          {checks.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      {checks.rowProblems.length > 0 ? (
        <details className="text-xs text-slate-700">
          <summary className="cursor-pointer">
            שורות שלא הותאמו ({checks.rowProblemCount}) · מוצגות {Math.min(SHOWN_PROBLEMS, checks.rowProblems.length)}
          </summary>
          <ul className="mt-1 list-disc pr-5">
            {checks.rowProblems.slice(0, SHOWN_PROBLEMS).map((item) => (
              <li key={`${item.rowNumber}-${item.message}`}>
                שורה {item.rowNumber}: {item.message}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function ComparisonRow({ row }: { row: SonilComparisonRow }) {
  const ours = row.ours;
  const sonilActions = row.sonil?.actions ?? [];
  const sonilTexts = row.sonil?.texts ?? [];
  return (
    <TableRow>
      <TableCell className="align-top">
        <div className="font-medium text-slate-900">{row.entityName ?? `מזהה ${row.entityId}`}</div>
        <div className="text-xs text-slate-500">
          {LEVEL_LABELS[row.level]} · ID {row.entityId}
          {row.campaignName ? ` · ${row.campaignName}` : ""}
        </div>
      </TableCell>
      <TableCell className="align-top">
        {ours ? (
          <>
            <ToneBadge tone={ours.tone} label={ours.actionLabel} />
            <div className="mt-1 text-xs text-slate-600">{ours.reason}</div>
          </>
        ) : (
          <span className="text-xs text-slate-500">אין המלצה</span>
        )}
      </TableCell>
      <TableCell className="align-top">
        {row.sonil ? (
          <>
            {sonilTexts.map((text) => (
              <div key={text} className="text-xs text-slate-800">
                &quot;{text}&quot;
              </div>
            ))}
            {sonilActions.length > 0 ? (
              <div className="mt-1 text-xs text-slate-600">{sonilActions.map((action) => ACTION_LABELS[action]).join(", ")}</div>
            ) : null}
          </>
        ) : (
          <span className="text-xs text-slate-500">לא נתן המלצה</span>
        )}
      </TableCell>
      <TableCell className="align-top">
        <ToneBadge tone={OUTCOME_TONE[row.outcome]} label={OUTCOME_LABELS[row.outcome]} />
        <div className="mt-1 text-xs text-slate-600">{row.outcomeText}</div>
        <details className="mt-2 text-xs text-slate-700">
          <summary className="cursor-pointer text-slate-600">הנתונים והכללים</summary>
          {ours ? (
            <div className="mt-1 flex flex-col gap-1">
              <div className="font-medium">{ours.ruleCode}</div>
              <div>{ours.ruleText}</div>
              {ours.facts.map((fact) => (
                <div key={fact}>• {fact}</div>
              ))}
              <div>ביטחון: {ours.confidence === "high" ? "גבוה" : ours.confidence === "medium" ? "בינוני" : "נמוך"}</div>
              {ours.missingData.map((item) => (
                <div key={item} className="text-orange-800">
                  חסר: {item}
                </div>
              ))}
            </div>
          ) : null}
          {row.sonil ? (
            <div className="mt-2 flex flex-col gap-1">
              <div className="font-medium">הטקסט המקורי של סוניל</div>
              {sonilTexts.map((text) => (
                <div key={text}>&quot;{text}&quot;</div>
              ))}
              <div className="text-slate-500">שורות בקובץ: {row.sonil.rowNumbers.join(", ")}</div>
            </div>
          ) : null}
        </details>
      </TableCell>
      <TableCell className="align-top text-xs text-slate-700">{row.suggestedCheck}</TableCell>
    </TableRow>
  );
}
