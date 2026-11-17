/**
 * CRM lead-quality rules for the Meta CRM feedback. Pure: no I/O and no
 * server-only imports, so the rules are tested without a database.
 *
 * RAW: the first stage of every lead. Meta expects each lead's first stage, so a
 * raw lead is sent when the system first sees a lead, but only while the lead is
 * recent. An old lead seen for the first time sends nothing.
 * QUALIFIED: CRM main status "בתהליך" or "נרשם", OR a student rating
 * (דירוג תלמיד) of 4 or 5 flames.
 * REGISTERED: CRM main status "נרשם".
 *
 * An event fires on the change from "not yet" to "yes", never on a repeat.
 * Transitions are computed from the stored state BEFORE the change, so a lead
 * that qualifies several ways still gets one qualified event. The outbox also
 * enforces one row per lead and event type.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export const QUALIFIED_MAIN_STATUSES: readonly string[] = ["בתהליך", "נרשם"];
export const REGISTERED_MAIN_STATUS = "נרשם";
export const QUALIFYING_RATING_MIN = 4;
export const QUALIFYING_RATING_MAX = 5;

/**
 * A lead is recent for its raw-lead event while it is at most a week old, plus
 * one day, because the dashboard knows only the calendar date of creation.
 */
export const RECENT_LEAD_MAX_AGE_MS = 8 * DAY_MS;

export type CrmEventType = "raw" | "qualified" | "registered";

export interface LeadQualitySnapshot {
  mainStatus: string;
  studentRating: number | null;
}

/** A lead with no stored row is the implicit default: "חדש", no rating. */
const NO_STORED_STATE: LeadQualitySnapshot = { mainStatus: "חדש", studentRating: null };

export function isQualified(snapshot: LeadQualitySnapshot): boolean {
  if (QUALIFIED_MAIN_STATUSES.includes(snapshot.mainStatus)) return true;
  const rating = snapshot.studentRating;
  return rating !== null && rating >= QUALIFYING_RATING_MIN && rating <= QUALIFYING_RATING_MAX;
}

export function isRegistered(snapshot: LeadQualitySnapshot): boolean {
  return snapshot.mainStatus === REGISTERED_MAIN_STATUS;
}

/**
 * The CRM events a change produces, in the order they are queued. Qualified
 * comes first, so a lead that jumps straight to "נרשם" gets both events.
 */
export function crmEventsForChange(previous: LeadQualitySnapshot | undefined, next: LeadQualitySnapshot): CrmEventType[] {
  const before = previous ?? NO_STORED_STATE;
  const events: CrmEventType[] = [];
  if (!isQualified(before) && isQualified(next)) events.push("qualified");
  if (!isRegistered(before) && isRegistered(next)) events.push("registered");
  return events;
}

/**
 * Whether a lead's creation date (YYYY-MM-DD, from the dashboard) is recent
 * enough for its raw lead to be sent. An unknown date is not recent.
 */
export function isRecentLead(leadCreatedDate: string | undefined, now: Date): boolean {
  if (leadCreatedDate === undefined || !/^\d{4}-\d{2}-\d{2}$/.test(leadCreatedDate)) return false;
  const created = Date.parse(`${leadCreatedDate}T00:00:00Z`);
  return Number.isFinite(created) && now.getTime() - created <= RECENT_LEAD_MAX_AGE_MS;
}

/**
 * The CRM events a change produces, as they are queued. A stored lead gives the
 * usual transitions. A lead the system has never stored (a first sighting) gets
 * its raw lead first, when the lead is recent, then the stages it is already at.
 * An old lead seen for the first time queues nothing: its stages happened long
 * ago, and Meta would receive them as if they happened now.
 */
export function crmEventsForRecord(previous: LeadQualitySnapshot | undefined, next: LeadQualitySnapshot, leadIsRecent: boolean): CrmEventType[] {
  if (previous !== undefined) return crmEventsForChange(previous, next);
  if (!leadIsRecent) return [];
  return ["raw", ...crmEventsForChange(undefined, next)];
}
