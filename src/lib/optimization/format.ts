import { REPORTING_TIMEZONE } from "@/lib/advertising/timezone";

/** Hebrew-facing number formatting for the optimization center. Always en-US grouping, so server and browser render the same text. */

export function formatIls(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `₪${Math.round(value).toLocaleString("en-US")}`;
}

export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return Math.round(value).toLocaleString("en-US");
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function formatRatio(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

/** A ₪ amount with two decimals, for unit prices such as CPC and CPM. */
export function formatIlsExact(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `₪${value.toFixed(digits)}`;
}

/** A signed relative change, e.g. "+12.5%" or "-30.0%". */
export function formatChange(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

/** "2026-10-29" -> "29.10.2026". The text is returned unchanged when it is not an ISO day. */
export function formatIsoDayDmy(isoDay: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDay);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : isoDay;
}

/** A date range as one readable phrase: "29.10.2026 – 04.11.2026". */
export function formatRangeDmy(range: { since: string; until: string }): string {
  return `${formatIsoDayDmy(range.since)} – ${formatIsoDayDmy(range.until)}`;
}

/** An instant in the reporting timezone, to the minute: "04.11.2026 14:24". */
export function formatRunTimestamp(instant: string): string {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: REPORTING_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("day")}.${part("month")}.${part("year")} ${part("hour")}:${part("minute")}`;
}
