import { effectiveStudentRating, isStudentRating } from "@/lib/lead-status/student-rating";
import type { LeadFact } from "@/lib/performance/types";
import type { LeadQualityCount, LeadStudentRatingSummary } from "./types";

/** Cooperation is ratings 3–5 divided by every incoming lead, never only the reportable/rated subset. */
export function studentRatingCooperation(
  summary: LeadStudentRatingSummary | null | undefined,
  totalLeads: number,
  leadsKnown: boolean,
): LeadQualityCount {
  if (!summary || !Number.isInteger(totalLeads) || totalLeads < 0) return { count: 0, percent: null };
  const counts = summary.cooperation
    ? [summary.cooperation.count]
    : [summary.byRating?.["3"]?.count, summary.byRating?.["4"]?.count, summary.byRating?.["5"]?.count];
  if (counts.some((count) => typeof count !== "number" || !Number.isInteger(count) || count < 0)) return { count: 0, percent: null };
  const count = (counts as number[]).reduce((sum, value) => sum + value, 0);
  if (!Number.isSafeInteger(count) || count > totalLeads) return { count: 0, percent: null };
  return { count, percent: leadsKnown && totalLeads > 0 ? count / totalLeads * 100 : null };
}

/** Same lead-entry cohort as spend. Known missing ratings report as ordinary 2 without changing their raw value. */
export function summarizeStudentRatings(
  leads: readonly LeadFact[],
  spend: number | null,
  leadsKnown: boolean,
): LeadStudentRatingSummary {
  const counts = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  let unrated = 0;
  let defaulted = 0;
  for (const lead of leads) {
    const missing = lead.studentRating === null || lead.studentRating === undefined;
    // A failed status read cannot tell us whether the CRM rating is actually missing.
    if (missing && !lead.statusKnown) {
      unrated += 1;
      continue;
    }
    const rating = effectiveStudentRating(lead.studentRating);
    if (isStudentRating(rating)) {
      counts[String(rating) as keyof typeof counts] += 1;
      if (missing) defaulted += 1;
    } else {
      unrated += 1;
    }
  }
  const counted = (count: number): LeadQualityCount => ({
    count,
    percent: leadsKnown && leads.length > 0 ? count / leads.length * 100 : null,
  });
  const excellent = counts["4"] + counts["5"];
  const complete = leadsKnown && unrated === 0;
  return {
    ordinary: counted(counts["2"] + counts["3"]),
    excellent: counted(excellent),
    cooperation: counted(counts["3"] + counts["4"] + counts["5"]),
    cold: counted(counts["1"]),
    unrated: counted(unrated),
    rated: counted(leads.length - unrated),
    defaulted: counted(defaulted),
    byRating: { "1": counted(counts["1"]), "2": counted(counts["2"]), "3": counted(counts["3"]), "4": counted(counts["4"]), "5": counted(counts["5"]) },
    costPerExcellent: complete && excellent > 0 && spend !== null && Number.isFinite(spend) && spend >= 0
      ? spend / excellent : null,
    complete,
  };
}
