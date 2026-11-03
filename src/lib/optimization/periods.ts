import type { DateRange } from "@/lib/advertising/types";

/**
 * Date arithmetic on "YYYY-MM-DD" strings, done in UTC so the server's own timezone never shifts a day. The reporting
 * day ("today") is passed in by the caller, already resolved in Asia/Jerusalem.
 */

const DAY_MS = 86_400_000;

export function addDaysIso(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Inclusive number of days in a range. Returns 0 when the range is inverted. */
export function inclusiveDayCount(range: DateRange): number {
  const [sy, sm, sd] = range.since.split("-").map(Number);
  const [uy, um, ud] = range.until.split("-").map(Number);
  const diff = Math.round((Date.UTC(uy, um - 1, ud) - Date.UTC(sy, sm - 1, sd)) / DAY_MS);
  return diff < 0 ? 0 : diff + 1;
}

function listDates(since: string, until: string): string[] {
  const dates: string[] = [];
  for (let date = since; date <= until; date = addDaysIso(date, 1)) dates.push(date);
  return dates;
}

export interface PeriodPlan {
  selected: DateRange;
  selectedDays: number;
  /** True when the selection reaches today or later, so today's figures are partial and not comparable to a full day. */
  selectedPartial: boolean;
  /** Complete days of the selection, ascending. Used for daily checks such as budget concentration. */
  completeDates: string[];
  /** The part of the selection used for trends: complete days only. Null when the selection has no complete day. */
  trendCurrent: DateRange | null;
  /** The same number of days directly before trendCurrent, with no overlap. Null when trendCurrent is null. */
  trendPrevious: DateRange | null;
  /** One Hebrew sentence for the UI that explains the comparison. */
  trendNote: string;
}

/**
 * Plans the windows for one run. The trend compares the selection's complete days with the same number of days
 * before them. A partial today is left out of the trend, so a half day is never shown as a decline against a full one.
 */
export function planPeriods(selected: DateRange, today: string): PeriodPlan {
  const selectedDays = inclusiveDayCount(selected);
  const selectedPartial = selected.until >= today;
  const completeUntil = selectedPartial ? addDaysIso(today, -1) : selected.until;
  const hasComplete = completeUntil >= selected.since && selectedDays > 0;

  const completeDates = hasComplete ? listDates(selected.since, completeUntil) : [];
  const trendCurrent: DateRange | null = hasComplete ? { since: selected.since, until: completeUntil } : null;
  const trendPrevious: DateRange | null = trendCurrent
    ? {
        since: addDaysIso(trendCurrent.since, -inclusiveDayCount(trendCurrent)),
        until: addDaysIso(trendCurrent.since, -1),
      }
    : null;

  let trendNote: string;
  if (!trendCurrent || !trendPrevious) {
    trendNote = "אין ימים מלאים בטווח, לכן אין השוואת מגמה לתקופה הקודמת.";
  } else if (selectedPartial) {
    trendNote = `היום נכלל כיום חלקי: המגמה מחושבת על ימים מלאים בלבד (${trendCurrent.since} עד ${trendCurrent.until}) מול ${trendPrevious.since} עד ${trendPrevious.until}, באותו אורך ובלי חפיפה. הערכים המוחלטים כוללים את היום החלקי.`;
  } else {
    trendNote = `המגמה: ${trendCurrent.since} עד ${trendCurrent.until} מול ${trendPrevious.since} עד ${trendPrevious.until}, באותו אורך ובלי חפיפה.`;
  }

  return { selected, selectedDays, selectedPartial, completeDates, trendCurrent, trendPrevious, trendNote };
}

/** True when a lead's reporting date falls inside a range (both ends inclusive). */
export function dateInRange(isoDate: string, range: DateRange): boolean {
  return isoDate >= range.since && isoDate <= range.until;
}
