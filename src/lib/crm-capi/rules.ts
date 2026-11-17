/**
 * CRM lead-quality rules for the Meta CRM feedback. Pure: no I/O and no
 * server-only imports, so the rules are tested without a database.
 *
 * QUALIFIED: CRM main status "בתהליך", "נרשם" or "ברח במעמד התשלום", OR a student rating
 * (דירוג תלמיד) of 4 or 5 flames.
 * REGISTERED: CRM main status "נרשם" only. A lead that fled at the payment stage is
 * qualified, but never registered by that status.
 *
 * An event fires on the change from "not yet" to "yes", never on a repeat.
 * Transitions are computed from the stored state BEFORE the change, so a lead
 * that qualifies several ways still gets one qualified event. The outbox also
 * enforces one row per lead and event type.
 */

export const QUALIFIED_MAIN_STATUSES: readonly string[] = ["בתהליך", "נרשם", "ברח במעמד התשלום"];
export const REGISTERED_MAIN_STATUS = "נרשם";
export const QUALIFYING_RATING_MIN = 4;
export const QUALIFYING_RATING_MAX = 5;

export type CrmEventType = "qualified" | "registered";

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
