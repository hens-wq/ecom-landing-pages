/**
 * The Meta reach reads, as pure functions: the query each read sends and how its rows become numbers. provider.ts sends
 * the requests. Keeping the query shapes here lets a unit test check exactly what is asked of Meta, with no network call.
 * Read only: nothing in this file writes to Meta.
 */
import { AdvertisingApiError, type DateRange } from "@/lib/advertising/types";

const PAGE_LIMIT = "500";

/** One reach row as Meta returns it. Meta sends the reach as a string. */
export interface ReachRow {
  campaign_id?: string;
  adset_id?: string;
  reach?: string;
}

function timeRangeOf(range: DateRange): string {
  return JSON.stringify({ since: range.since, until: range.until });
}

/** Query parameters for the unique reach of every campaign, or every ad set, for the range. */
export function levelReachParams(level: "campaign" | "adset", range: DateRange): Record<string, string> {
  if (level === "campaign") {
    return { level: "campaign", fields: "campaign_id,reach", time_range: timeRangeOf(range), limit: PAGE_LIMIT };
  }
  return { level: "adset", fields: "adset_id,reach", time_range: timeRangeOf(range), limit: PAGE_LIMIT };
}

/**
 * Query parameters for the unique reach across the course: the account level, with the excluded campaigns filtered out by
 * Meta. Their people are then not counted, the same way their spend is not counted.
 */
export function courseReachParams(range: DateRange, excludedCampaignIds: readonly string[]): Record<string, string> {
  const params: Record<string, string> = { level: "account", fields: "reach", time_range: timeRangeOf(range) };
  if (excludedCampaignIds.length > 0) {
    params.filtering = JSON.stringify([{ field: "campaign.id", operator: "NOT_IN", value: [...excludedCampaignIds] }]);
  }
  return params;
}

/**
 * Meta's reach for one row. Meta returns reach for every row it is asked for, so a missing or unreadable value is a failed
 * read, never zero: a zero would show people as reached when the read did not say so.
 */
export function reachFromRow(row: ReachRow): number {
  const parsed = Number(row.reach);
  if (row.reach === undefined || !Number.isFinite(parsed)) {
    throw new AdvertisingApiError("api_error", "Meta לא החזירה תפוצה לחלק מהשורות שביקשנו.", "reach field missing or not numeric");
  }
  return parsed;
}

/** Reach keyed by the id of each row. A row with no id is skipped; the caller reads only the ids it needs. */
export function reachById(rows: ReachRow[], idOf: (row: ReachRow) => string | undefined): Record<string, number> {
  const reaches: Record<string, number> = {};
  for (const row of rows) {
    const id = idOf(row);
    if (id) reaches[id] = reachFromRow(row);
  }
  return reaches;
}

/**
 * The course reach from its account-level rows. Meta returns no row when nothing was delivered in the range, and then the
 * reach is zero. More than one row would not be a single total, so it is refused rather than guessed.
 */
export function courseReachFromRows(rows: ReachRow[]): number {
  if (rows.length > 1) {
    throw new AdvertisingApiError("api_error", "התקבלו כמה שורות לתפוצה הכוללת של החשבון, ולכן לא ניתן לקבוע אותה.", `account reach rows: ${rows.length}`);
  }
  return rows.length === 0 ? 0 : reachFromRow(rows[0]);
}
