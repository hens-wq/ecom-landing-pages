"use client";

import { ExternalLink, Loader2 } from "lucide-react";

import type { DateRange } from "@/lib/advertising/types";
import { formatNumber } from "@/lib/format";
import type { AdClosureSummary } from "@/lib/lead-quality/ad-closures";
import { formatCplCurrency } from "@/lib/lead-quality/presentation";
import type { LeadQualityColor } from "@/lib/lead-quality/types";
import { cn } from "@/lib/utils";

export interface AdClosureContext {
  adClosures?: readonly AdClosureSummary[];
  closureRange?: DateRange;
  closuresLoading?: boolean;
  closuresError?: boolean;
}

const COST_COLORS: Record<LeadQualityColor, string> = { green: "text-emerald-800", orange: "text-amber-900", red: "text-rose-800", neutral: "text-foreground" };

/** Closure CPA has its own business thresholds; the 80/120 lead-cost bands do not apply. */
export function getClosureCostColor(value: number | null | undefined): LeadQualityColor {
  if (value === null || value === undefined || !Number.isFinite(value) || value < 0) return "neutral";
  const cents = Math.round((value + Number.EPSILON) * 100);
  if (cents <= 150000) return "green";
  if (cents <= 300000) return "orange";
  return "red";
}

function countText(summary: AdClosureSummary | undefined): string {
  if (!summary || (!summary.complete && summary.closures === 0)) return "לא זמין";
  return `${summary.complete ? "" : "לפחות "}${formatNumber(summary.closures)}`;
}

function rangeLabel(range: DateRange): string {
  const date = (iso: string) => { const [year, month, day] = iso.split("-"); return `${day}.${month}.${year}`; };
  return `${date(range.since)} — ${date(range.until)}`;
}

export function AdClosureBand({ summary, range, loading = false, error = false }: { summary?: AdClosureSummary; range?: DateRange; loading?: boolean; error?: boolean }) {
  const known = !loading && !error ? summary : undefined;
  const positive = Boolean(known && known.closures > 0);
  const cpa = known?.complete && !known.isUnassigned ? known.costPerClosure : null;

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t px-3 py-2 text-center", positive ? "border-emerald-100 bg-emerald-50/70" : "border-slate-200 bg-slate-50")} aria-label="סגירות המודעה מהלידים שנקלטו ב־30 הימים האחרונים">
      <div className="text-[11px] text-foreground"><p className="font-semibold">סגירות ב־30 יום</p><p className="text-[10px]">מלידים שנקלטו בטווח</p>{range ? <span className="sr-only">{rangeLabel(range)}, כולל היום, יום חלקי</span> : null}</div>
      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold", positive ? "bg-emerald-100 text-emerald-800" : "bg-white text-foreground")}>
        {loading ? <><Loader2 className="size-3 animate-spin" aria-hidden="true" />טוען...</> : countText(known)}
      </span>
      <div className="text-[11px]"><span className="text-foreground">עלות לסגירה: </span><bdi className={cn("font-bold", COST_COLORS[getClosureCostColor(cpa)])}>{formatCplCurrency(cpa)}</bdi></div>
      {known?.isUnassigned ? <p className="basis-full text-[10px] text-foreground">אין שיוך למודעה, ולכן לא ניתן לחשב לה עלות לסגירה</p> : null}
    </div>
  );
}

function statusOf(summary: AdClosureSummary): { label: string; active: boolean } {
  if (summary.isUnassigned) return { label: "ללא שיוך", active: false };
  if (summary.parentStatus === "paused" || summary.parentStatus === "ended") return { label: "הסדרה סגורה", active: false };
  if (summary.status === "active") return { label: summary.parentStatus === "active" ? "פעילה" : "פעילה, סטטוס הסדרה לא ידוע", active: summary.parentStatus === "active" };
  if (summary.status === "paused") return { label: "כבויה", active: false };
  if (summary.status === "ended") return { label: "הסתיימה", active: false };
  return { label: "סטטוס לא ידוע", active: false };
}

export function AdClosuresSourceTable({ adClosures, closureRange, closuresLoading = false, closuresError = false, formatAdLabel }: AdClosureContext & { formatAdLabel: (name: string) => string }) {
  const winners = adClosures?.filter((summary) => summary.closures > 0) ?? [];
  const partial = adClosures?.some((summary) => !summary.complete) ?? false;

  return (
    <section dir="rtl" className="space-y-2 rounded-lg border border-slate-200 bg-white p-3" aria-label="מקור הסגירות ב־30 הימים האחרונים">
      <header className="space-y-1 text-center"><h3 className="text-sm font-bold text-heading">מקור הסגירות • 30 יום</h3><p className="text-[11px] text-foreground">הרשמות מלידים שנקלטו בטווח, ללא תלות בטווח התצוגה{closureRange ? <> · <bdi>{rangeLabel(closureRange)}</bdi> · כולל היום, יום חלקי</> : null}</p></header>
      {closuresLoading ? <p role="status" className="flex items-center justify-center gap-2 py-3 text-xs text-foreground"><Loader2 className="size-3.5 animate-spin" aria-hidden="true" />טוען מקור סגירות...</p> : closuresError || !adClosures ? <p role="status" className="py-3 text-center text-xs text-foreground">נתוני מקור הסגירות ל־30 יום אינם זמינים כרגע</p> : winners.length === 0 ? <p className="py-3 text-center text-xs text-foreground">{partial ? "נתוני הסגירות חלקיים, ולא ניתן לקבוע אם היו סגירות נוספות בטווח" : adClosures.length === 0 ? "אין נתוני מודעות להצגת מקור סגירות בטווח" : "לא נרשמו סגירות מלידים שנקלטו בטווח"}</p> : (
        <>
          <div role="region" tabIndex={0} aria-label="טבלת מודעות שהביאו סגירות, ניתנת לגלילה אופקית" className="max-w-full overflow-x-auto rounded-md border border-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <table className="w-full border-collapse text-center text-xs" dir="rtl">
              <caption className="sr-only">המודעות עם הרשמות מהלידים שנקלטו ב־30 הימים האחרונים, כולל מודעות וסדרות כבויות. שורות ללא שיוך אינן מיוחסות למודעה מסוימת.</caption>
              <thead><tr className="bg-slate-100 text-foreground">{["סדרת מודעות", "מודעה", "סגירות", "הוצאה ב־30 יום", "עלות לסגירה", "לידים ב־30 יום", "מצב", "תצוגה"].map((label) => <th key={label} scope="col" className="border-b border-slate-200 px-2 py-2 text-center text-[11px] font-semibold">{label}</th>)}</tr></thead>
              <tbody>{winners.map((summary) => {
                const status = statusOf(summary);
                const cpa = summary.complete && !summary.isUnassigned ? summary.costPerClosure : null;
                const displayName = summary.isUnassigned ? summary.adName : formatAdLabel(summary.adName);
                return (
                  <tr key={summary.adId} className="border-b border-slate-100 last:border-b-0">
                    <td className="min-w-32 max-w-60 break-words px-2 py-2 text-center text-foreground">{summary.isUnassigned ? "ללא שיוך" : summary.adSetName || "סדרה לא ידועה"}</td>
                    <th scope="row" className="min-w-28 max-w-60 break-words px-2 py-2 text-center font-medium text-foreground">{displayName}</th>
                    <td className="px-2 py-2 text-center"><span className="whitespace-nowrap rounded-full bg-emerald-100 px-2 py-1 font-bold text-emerald-800">{countText(summary)}</span></td>
                    <td className="whitespace-nowrap px-2 py-2 text-center text-foreground"><bdi>{formatCplCurrency(summary.spend)}</bdi></td>
                    <td className={cn("whitespace-nowrap px-2 py-2 text-center font-bold", COST_COLORS[getClosureCostColor(cpa)])}><bdi>{formatCplCurrency(cpa)}</bdi></td>
                    <td className="whitespace-nowrap px-2 py-2 text-center text-foreground">{summary.complete ? "" : "לפחות "}{formatNumber(summary.totalLeads)}</td>
                    <td className="px-2 py-2 text-center"><span className={cn("inline-block rounded-full px-2 py-1 text-[10px] font-medium", status.active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-foreground")}>{status.label}</span></td>
                    <td className="px-2 py-2 text-center">{summary.isUnassigned ? <span className="text-foreground">—</span> : <a href={`/creative/${encodeURIComponent(summary.adId)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1 whitespace-nowrap text-[11px] font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-primary">צפייה<ExternalLink className="size-3" aria-hidden="true" /><span className="sr-only"> ב{displayName}, נפתח בחלון חדש</span></a>}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
          {partial ? <p className="text-center text-[11px] text-foreground">הספירות חלקיות, ייתכנו סגירות נוספות שטרם התקבלו</p> : null}
          {winners.some((summary) => summary.isUnassigned) ? <p className="text-center text-[11px] text-foreground">סגירות ללא שיוך מוצגות בנפרד, ולא מיוחסות למודעה או לעלות שלה</p> : null}
        </>
      )}
    </section>
  );
}
