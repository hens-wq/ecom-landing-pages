import type { DateRange } from "@/lib/advertising/types";

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Turns a "last N days" preset into concrete since/until calendar dates, anchored
 * to the real current date (never the fixed 2026-09-10 date the mock dataset's
 * own content happens to be written around - that date only matters for how the
 * mock data was authored, not for how date-range math works).
 */
export function presetDaysToDateRange(days: number, today: Date = new Date()): DateRange {
  const until = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const since = new Date(until);
  since.setUTCDate(since.getUTCDate() - (days - 1));
  return { since: toIsoDate(since), until: toIsoDate(until) };
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
