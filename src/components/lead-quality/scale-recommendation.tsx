"use client";

import { ArrowLeft, Flame, Info, Loader2, TrendingUp } from "lucide-react";

import { StudentRatingSummary } from "@/components/lead-quality/student-rating-summary";
import { formatNumber } from "@/lib/format";
import { formatCplCurrency } from "@/lib/lead-quality/presentation";
import type { CampaignScaleAssessment } from "@/lib/lead-quality/scale";
import type { LeadQualityColor } from "@/lib/lead-quality/types";
import { cn } from "@/lib/utils";

interface ScaleState {
  assessment?: CampaignScaleAssessment;
  loading?: boolean;
  error?: boolean;
}

const BADGE_COLORS: Record<LeadQualityColor, string> = {
  green: "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  orange: "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100",
  red: "border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100",
  neutral: "border-slate-300 bg-slate-50 text-foreground hover:bg-slate-100",
};
const PANEL_COLORS: Record<LeadQualityColor, string> = {
  green: "border-emerald-200 bg-emerald-50/50",
  orange: "border-amber-200 bg-amber-50/50",
  red: "border-rose-200 bg-rose-50/50",
  neutral: "border-slate-200 bg-slate-50",
};

function dateLabel(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

function hasScaleSignal(assessment: CampaignScaleAssessment | undefined): assessment is CampaignScaleAssessment {
  return Boolean(assessment && (assessment.registrations > 0 || (assessment.studentRating?.excellent.count ?? 0) > 0) && (assessment.status === "candidate" || assessment.status === "review"));
}

export function CampaignScaleBadge({ assessment, loading = false, error = false, expanded, panelId, onOpen }: ScaleState & { expanded: boolean; panelId: string; onOpen: () => void }) {
  if (loading) return <span role="status" className="inline-flex items-center gap-1.5 text-[11px] text-foreground"><Loader2 className="size-3 animate-spin" aria-hidden="true" />בודק סקייל...</span>;
  if (error || assessment?.status === "unavailable") return <span role="status" className="inline-flex items-center gap-1.5 text-[11px] text-foreground"><Info className="size-3" aria-hidden="true" />בדיקת סקייל לא זמינה</span>;
  if (!hasScaleSignal(assessment)) return null;
  const ratingOnly = assessment.registrations === 0;
  const BadgeIcon = ratingOnly ? Flame : TrendingUp;

  return (
    <button type="button" aria-expanded={expanded} aria-controls={panelId} onClick={() => { if (!expanded) onOpen(); }} className={cn("inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary", BADGE_COLORS[assessment.badge.color])}>
      <BadgeIcon className="size-3.5" aria-hidden="true" />
      {assessment.badge.label}
      <span className="border-s border-current/20 ps-1.5 text-[10px] font-medium">30 יום</span>
      <span className="sr-only">, {ratingOnly ? "הצג את דירוגי התלמידים" : "הצג את הסיבות ואת הצעת התקציב"} לפי 30 הימים האחרונים</span>
    </button>
  );
}

export function CampaignScaleRecommendation({ assessment, loading = false, error = false }: ScaleState) {
  if (loading) return <div role="status" className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-foreground"><Loader2 className="size-3.5 animate-spin" aria-hidden="true" />טוען את בדיקת הסקייל ל־30 הימים האחרונים...</div>;
  if (error || assessment?.status === "unavailable") return <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center text-xs leading-6 text-foreground">בדיקת הסקייל ל־30 הימים האחרונים אינה זמינה כרגע. לא ניתן לקבוע אם הקמפיין מועמד להגדלה.</div>;
  if (!assessment) return <div role="status" className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center text-xs text-foreground">לא התקבלה בדיקת סקייל ל־30 הימים האחרונים עבור הקמפיין הזה.</div>;
  if (!hasScaleSignal(assessment)) return null;

  const limited = assessment.confidence === "limited";
  const ratingOnly = assessment.registrations === 0;
  const ratingTotal = assessment.studentRating ? assessment.studentRating.rated.count + assessment.studentRating.unrated.count : 0;
  const ratingSourcesKnown = Boolean(assessment.studentRating && (assessment.studentRating.rated.percent !== null || (ratingTotal === 0 && assessment.studentRating.complete)));
  const SignalIcon = ratingOnly ? Flame : TrendingUp;
  const noBudgetMessage = ratingOnly
    ? "דירוגים מצוינים מעידים על פוטנציאל. ללא הרשמות לא מוצעת הגדלת תקציב מספרית."
    : assessment.action === "reactivate_review"
    ? "הקמפיין אינו פעיל. יש לבחון חידוש פעילות לפני הגדלת תקציב."
    : !assessment.dataComplete
      ? "יש להשלים את נתוני הבדיקה לפני הצעת סכום להגדלה."
    : assessment.budgetMode === "lifetime"
      ? "מוגדר תקציב כולל לתקופה, ולכן אין כאן הצעת תקציב יומי."
      : assessment.budgetMode === "unknown"
        ? "לא התקבל תקציב יומי עדכני, ולכן לא מוצע סכום יומי חדש."
        : "נדרשת בדיקה לפני הצעת הגדלה מספרית של התקציב.";

  return (
    <section dir="rtl" aria-label={ratingOnly ? "איכות לידים לפי 30 הימים האחרונים" : "המלצת סקייל לפי 30 הימים האחרונים"} className={cn("space-y-3 rounded-lg border p-3 text-foreground sm:p-4", PANEL_COLORS[assessment.badge.color])}>
      <header className="space-y-1 text-center">
        <h3 className="inline-flex items-center justify-center gap-2 text-sm font-bold text-heading"><SignalIcon className="size-4" aria-hidden="true" />{assessment.badge.label}</h3>
        <p className="text-xs font-medium">30 הימים האחרונים, ללא תלות בטווח התצוגה</p>
        <p className="flex flex-wrap items-center justify-center gap-2 text-[11px]"><bdi>{dateLabel(assessment.range.since)} — {dateLabel(assessment.range.until)}</bdi><span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-900">כולל היום, יום חלקי</span></p>
      </header>

      <dl className="grid grid-cols-1 gap-2 rounded-md border border-slate-200 bg-white p-3 text-center sm:grid-cols-3">
        <div><dt className="text-[11px]">הוצאה ב־30 יום</dt><dd className="mt-1 text-base font-bold"><bdi>{formatCplCurrency(assessment.spend)}</bdi></dd></div>
        <div><dt className="text-[11px]">הרשמות מלידים שנקלטו בטווח</dt><dd className="mt-1 text-base font-bold">{!assessment.dataComplete && assessment.registrations === 0 ? "לא זמין" : <>{!assessment.dataComplete ? "לפחות " : ""}{formatNumber(assessment.registrations)}</>}</dd></div>
        <div><dt className="text-[11px]">עלות להרשמה מלידים שנקלטו בטווח</dt><dd className="mt-1 text-base font-bold"><bdi>{formatCplCurrency(assessment.cpa)}</bdi></dd></div>
      </dl>

      <StudentRatingSummary summary={assessment.studentRating} totalLeads={ratingTotal} leadsKnown={ratingSourcesKnown} periodLabel="ב־30 הימים האחרונים" />

      <div className="space-y-1.5">
        <h4 className="text-xs font-bold">למה הקמפיין מסומן</h4>
        <ul className="list-disc space-y-1 ps-4 text-xs leading-6">{assessment.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
      </div>

      {assessment.sampleNote ? <p className={cn("rounded-md border px-3 py-2 text-xs leading-6", limited ? "border-amber-200 bg-amber-50 text-amber-950" : "border-slate-200 bg-white")}>{limited ? <strong>מדגם מוגבל: </strong> : null}{assessment.sampleNote}</p> : null}

      <div className="space-y-2 border-t border-slate-200 pt-3">
        <h4 className="text-center text-xs font-bold">{ratingOnly ? "בדיקת תקציב" : "הצעת תקציב יומי לבדיקה"}</h4>
        {!ratingOnly && assessment.budgetTargets.length > 0 ? assessment.budgetTargets.map((target) => (
          <div key={`${target.level}:${target.id}`} className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
            <p className="break-words text-center text-xs font-medium">{target.level === "campaign" ? "קמפיין" : "סדרת מודעות"}: {target.name}</p>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
              <dl><dt className="text-[11px]">תקציב יומי נוכחי</dt><dd className="mt-1 text-base font-bold"><bdi>{formatCplCurrency(target.currentDaily)}</bdi></dd></dl>
              <ArrowLeft className="size-4 text-primary" aria-hidden="true" />
              <dl><dt className="text-[11px]">תקציב יומי מוצע</dt><dd className="mt-1 text-base font-bold text-primary"><bdi>{formatCplCurrency(target.proposedDaily)}</bdi></dd></dl>
            </div>
            <p className="text-center text-[11px]">הגדלה של <strong><bdi>{target.increasePercent}%</bdi></strong>, תוספת <strong><bdi>{formatCplCurrency(target.increaseDaily)}</bdi></strong> ליום</p>
          </div>
        )) : (
          <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-center text-xs leading-6">
            {!ratingOnly && assessment.increasePercent !== null ? <p className="font-semibold">כיוון לבדיקה: הגדלה של <bdi>{assessment.increasePercent}%</bdi></p> : null}
            <p>{noBudgetMessage}</p>
          </div>
        )}
      </div>
      <p className="text-center text-[11px]">{assessment.basis}. ההמלצה אינה משנה תקציב אוטומטית.</p>
    </section>
  );
}
