import { isoDateInTimezone } from "@/lib/advertising/timezone";
import type { DateRange } from "@/lib/advertising/types";
import type { DateRangePreset } from "@/lib/types";

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Turns a "last N days" preset into concrete since/until calendar dates, anchored
 * to the real current date (never the fixed 2026-09-10 date the mock dataset's
 * own content happens to be written around - that date only matters for how the
 * mock data was authored, not for how date-range math works).
 *
 * "Today" is resolved in REPORTING_TIMEZONE (see lib/advertising/timezone.ts),
 * not the server's own UTC clock - a Vercel server's `new Date()` is always
 * UTC, so without this, "Today" would silently use a 00:00-24:00 UTC window
 * instead of matching Ads Manager's 00:00-24:00 Israel-time "Today".
 */
export function presetDaysToDateRange(days: number, today: Date = new Date()): DateRange {
  const untilIso = isoDateInTimezone(today);
  const until = new Date(`${untilIso}T00:00:00Z`); // used only as a calendar-date container for the subtraction below
  const since = new Date(until);
  since.setUTCDate(since.getUTCDate() - (days - 1));
  return { since: toIsoDate(since), until: untilIso };
}

/** A single calendar day, `daysAgo` days back from "today" in REPORTING_TIMEZONE (0 = today, 1 = yesterday). since === until. */
export function singleDayDateRange(daysAgo: number, today: Date = new Date()): DateRange {
  const untilIso = isoDateInTimezone(today);
  if (daysAgo === 0) return { since: untilIso, until: untilIso };
  const day = new Date(`${untilIso}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - daysAgo);
  const iso = toIsoDate(day);
  return { since: iso, until: iso };
}

/**
 * First day of the current calendar month (in REPORTING_TIMEZONE) through
 * today - deliberately NOT through the end of the month, since the days
 * after today haven't happened yet and would just show up as zeros.
 */
export function currentMonthDateRange(today: Date = new Date()): DateRange {
  const untilIso = isoDateInTimezone(today);
  return { since: `${untilIso.slice(0, 7)}-01`, until: untilIso };
}

/** Inclusive day count spanned by a date range, e.g. since=until -> 1 day. */
export function dateRangeDayCount(range: DateRange): number {
  const since = new Date(`${range.since}T00:00:00Z`).getTime();
  const until = new Date(`${range.until}T00:00:00Z`).getTime();
  const days = Math.round((until - since) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, days);
}

export function isValidDateRange(range: Partial<DateRange>): range is DateRange {
  if (!range.since || !range.until) return false;
  const since = new Date(range.since);
  const until = new Date(range.until);
  if (Number.isNaN(since.getTime()) || Number.isNaN(until.getTime())) return false;
  return since.getTime() <= until.getTime();
}

/** A date-range choice that's either one of the named presets or an explicit custom since/until - see components/shared/custom-date-range-select.tsx. */
export interface DateRangeSelection {
  presetId: string;
  customSince: string | null;
  customUntil: string | null;
}

export const CUSTOM_DATE_RANGE_PRESET_ID = "custom";

/**
 * Takes `presets` as a parameter (instead of importing DATE_RANGE_PRESETS
 * from lib/constants.ts directly) to avoid a circular import - constants.ts
 * already imports from this file for the presets' own resolve() functions.
 */
export function resolveDateRangeSelection(selection: DateRangeSelection, presets: DateRangePreset[]): DateRange {
  if (selection.presetId === CUSTOM_DATE_RANGE_PRESET_ID && selection.customSince && selection.customUntil) {
    return { since: selection.customSince, until: selection.customUntil };
  }
  const preset = presets.find((p) => p.id === selection.presetId) ?? presets[0];
  return preset.resolve();
}
