import { formatNumber } from "@/lib/format";
import { formatCplCurrency } from "@/lib/lead-quality/presentation";
import type { LeadQualityCount, LeadStudentRatingSummary } from "@/lib/lead-quality/types";

function RatingValue({ value, incomplete, totalLeads, leadsKnown }: { value: LeadQualityCount; incomplete: boolean; totalLeads: number; leadsKnown: boolean }) {
  const percent = leadsKnown && totalLeads > 0 && !(incomplete && value.count === 0) ? value.count / totalLeads * 100 : null;
  const percentLabel = percent === null ? "—" : `${percent.toLocaleString("he-IL", { maximumFractionDigits: 1 })}%`;
  return (
    <>
      <div className="whitespace-nowrap text-sm font-bold tabular-nums">{incomplete && percent !== null ? <span className="me-1 text-[10px] font-normal">לפחות</span> : null}<bdi dir="ltr">{percentLabel}</bdi></div>
      <div className="mt-0.5 whitespace-nowrap text-[10px]">{incomplete && value.count === 0 ? "לא ידוע" : <>{incomplete ? "לפחות " : ""}<bdi>{formatNumber(value.count)}</bdi> לידים</>}</div>
    </>
  );
}

/** Each flame level is separate; every percentage uses the full selected lead cohort. */
export function StudentRatingSummary({ summary: rating, totalLeads, leadsKnown, periodLabel = "בטווח הנבחר" }: {
  summary?: LeadStudentRatingSummary;
  totalLeads: number;
  leadsKnown: boolean;
  periodLabel?: string;
}) {
  if (!rating) return <p className="rounded-md border border-slate-200 bg-white px-3 py-2 text-center text-[11px] text-foreground">נתוני דירוג תלמיד אינם זמינים</p>;

  const columns: { key: string; label: string; value: LeadQualityCount; incomplete: boolean }[] = (["2", "3", "4", "5"] as const).map((key) => ({ key, label: `${key} להבות`, value: rating.byRating[key], incomplete: !rating.complete }));
  if (rating.cold.count > 0) columns.push({ key: "1", label: "להבה אחת · היסטורי", value: rating.byRating["1"], incomplete: !rating.complete });
  if (rating.unrated.count > 0) columns.push({ key: "unavailable", label: "נתונים לא זמינים", value: rating.unrated, incomplete: !leadsKnown });

  return (
    <section dir="rtl" aria-label={`סיכום דירוג תלמיד ${periodLabel}`} className="space-y-1.5 text-center text-foreground">
      <h4 className="text-[11px] font-bold">דירוג תלמיד <span className="font-normal">· {periodLabel}</span></h4>
      <div className="max-w-full overflow-x-auto rounded-md border border-slate-200 bg-white">
        <dl className="grid text-center text-[11px]" style={{ gridTemplateColumns: columns.map(({ key }) => `minmax(${key === "1" || key === "unavailable" ? 130 : 74}px, 1fr)`).join(" ") }}>
          {columns.map(({ key, label, value, incomplete }) => <div key={key} className="border-e border-slate-200 last:border-e-0"><dt className="whitespace-nowrap border-b border-slate-200 bg-slate-50 px-2 py-1.5 font-medium">{label}</dt><dd className="px-2 py-1.5"><RatingValue value={value} incomplete={incomplete} totalLeads={totalLeads} leadsKnown={leadsKnown} /></dd></div>)}
        </dl>
      </div>
      {rating.complete && rating.costPerExcellent !== null ? <p className="text-[11px]">עלות לליד מצוין: <bdi className="font-semibold">{formatCplCurrency(rating.costPerExcellent)}</bdi></p> : null}
      <p className="sr-only">אחוז מכלל {formatNumber(totalLeads)} הלידים לכל מספר להבות. כשלא הוגדר דירוג מוצגות שתי להבות. דירוג אינו משנה סטטוס או הרשמה.</p>
    </section>
  );
}
