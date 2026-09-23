/**
 * The IANA timezone "Today" / "Last N days" date-range presets, and the
 * Leads page's own date-range filtering, are computed against.
 *
 * Ecom is an Israeli company and Meta Ads Manager's "Today" is relative to
 * the ad account's own configured reporting timezone - almost certainly
 * Asia/Jerusalem for this account, but that could not be fetched from the ad
 * account itself and confirmed live (graph.facebook.com is network-blocked
 * in the sandbox this was built in - see PR notes). Defaulting to it here
 * means "Today" in this dashboard lines up with "Today" in Ads Manager
 * instead of drifting by the server's UTC offset (a real bug: a Vercel
 * server's `new Date()` is always UTC, so without this, "Today" would
 * silently use a 00:00-24:00 UTC window instead of 00:00-24:00 Israel time -
 * a 2-3 hour shift, wide enough to miss or wrongly include leads right
 * around midnight). Override with REPORTING_TIMEZONE if the account's actual
 * reporting timezone ever turns out to be different.
 *
 * NOTE: date-range.ts's presetDaysToDateRange() runs in the browser (it's
 * called directly from client component render code), where a non-
 * NEXT_PUBLIC_ env var is never available - only the hardcoded
 * "Asia/Jerusalem" fallback below is ever seen there, regardless of a real
 * REPORTING_TIMEZONE override. The override is only guaranteed to apply to
 * the server-only date math in lib/leads/meta/provider.ts. Not a concern
 * today (nothing sets this var), but worth knowing if it ever needs to.
 */
export const REPORTING_TIMEZONE = process.env.REPORTING_TIMEZONE?.trim() || "Asia/Jerusalem";

/** The UTC offset (minutes, positive = ahead of UTC) `timeZone` had at the instant `date` - computed via Intl so DST transitions are handled correctly for any date, not just "right now". */
function timezoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return (asUtc - date.getTime()) / 60_000;
}

/** "YYYY-MM-DD" for `date` as it reads on a wall clock in `timeZone` (defaults to REPORTING_TIMEZONE). */
export function isoDateInTimezone(date: Date, timeZone: string = REPORTING_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** The UTC instant (ms since epoch) of midnight at the start of `isoDate` ("YYYY-MM-DD") in `timeZone` (defaults to REPORTING_TIMEZONE). */
export function startOfDayUnixMs(isoDate: string, timeZone: string = REPORTING_TIMEZONE): number {
  const naiveUtcMidnight = Date.parse(`${isoDate}T00:00:00Z`);
  const offsetMinutes = timezoneOffsetMinutes(new Date(naiveUtcMidnight), timeZone);
  return naiveUtcMidnight - offsetMinutes * 60_000;
}

/**
 * "YYYY-MM-DD HH:mm:ss" for `date` as it reads on a wall clock in `timeZone`
 * (defaults to REPORTING_TIMEZONE) - unambiguous and unaffected by whatever
 * timezone the server or the consuming tool happens to be in. Built via
 * formatToParts (not a locale's own .format() string) so the exact
 * separators are guaranteed regardless of locale, and %24 guards against
 * the same midnight-as-"24" quirk timezoneOffsetMinutes above already
 * works around.
 */
export function formatDateTimeInTimezone(date: Date, timeZone: string = REPORTING_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  const hour = String(Number(get("hour")) % 24).padStart(2, "0");
  return `${get("year")}-${get("month")}-${get("day")} ${hour}:${get("minute")}:${get("second")}`;
}
