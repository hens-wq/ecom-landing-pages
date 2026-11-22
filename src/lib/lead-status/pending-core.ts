/**
 * Pending Fireberry updates: an update the webhook (or an import from Fireberry) could not apply to a lead
 * yet. It is kept here, so nothing is lost silently, and it is applied later, once the dashboard knows the lead
 * and the match is certain. Pure: the database lives in pending-store.ts, the replay logic in pending-replay.ts.
 */
import { createHash } from "node:crypto";

import type { LeadQualitySnapshot } from "@/lib/crm-capi/rules";
import type { StudentRating } from "@/lib/lead-status/student-rating";

export type PendingStatus = "open" | "applied" | "superseded" | "dismissed";
export type PendingReason =
  | "not_found"
  | "ambiguous"
  | "invalid_phone"
  | "missing_identity"
  | "meta_unavailable"
  | "unverified_match"
  | "imported";
export type PendingKind = "status" | "rating";

/**
 * The update as it would have been applied. A key that was not sent stays absent: "not sent" keeps the stored
 * value, while an explicit null clears it.
 */
export interface PendingPayload {
  mainStatus?: string;
  secondaryStatus?: string;
  fullPaymentAmount?: number | null;
  partialPaymentAmount?: number | null;
  studentRating?: StudentRating | null;
  /** The CRM's own change time, when it sent one (ISO 8601). */
  statusChangedAt?: string;
}

export interface PendingRow {
  id: number;
  status: PendingStatus;
  reason: PendingReason;
  kind: PendingKind;
  leadIdHint: string | null;
  normalizedPhone: string | null;
  payload: PendingPayload;
  /**
   * When the change happened, as far as is known: the time the update was received, or for an import the time
   * Fireberry recorded. The update is judged against the lead's writes to the same field from this moment on.
   */
  sourceAt: Date;
  firstReceivedAt: Date;
  lastReceivedAt: Date;
  receivedCount: number;
  attempts: number;
  lastCheckedAt: Date | null;
  lastError: string | null;
  resolvedLeadId: string | null;
  resolvedAt: Date | null;
}

export interface NewPendingUpdate {
  dedupeKey: string;
  reason: PendingReason;
  kind: PendingKind;
  leadIdHint: string | null;
  normalizedPhone: string | null;
  payload: PendingPayload;
  sourceAt: Date;
}

export interface PendingStore {
  /** Stores the update, or counts one more receipt when the same update is still open. */
  insert(input: NewPendingUpdate): Promise<{ id: number; inserted: boolean }>;
  listOpen(limit: number): Promise<PendingRow[]>;
  /** Open updates whose last check is older than the retry interval, oldest change first. */
  listRetryable(limit: number): Promise<PendingRow[]>;
  list(status: PendingStatus | "all", limit: number): Promise<PendingRow[]>;
  countByStatus(): Promise<Record<PendingStatus, number>>;
  get(id: number): Promise<PendingRow | undefined>;
  /** Records a check that did not apply the update, with its short code. */
  markChecked(id: number, code: string): Promise<void>;
  markApplied(id: number, leadId: string): Promise<void>;
  markSuperseded(id: number, leadId: string): Promise<void>;
  markDismissed(id: number): Promise<void>;
}

/** The change the CRM feedback needs. recordCrmChangeSafely takes this shape. */
export interface CrmChangeInput {
  leadKey: string;
  previous: LeadQualitySnapshot | undefined;
  next: LeadQualitySnapshot;
  statusChangedAt: Date | undefined;
  leadCreatedDate?: string;
  now: Date;
}

export type CrmChangeRecorder = (change: CrmChangeInput) => Promise<void>;

/** The payload with its keys sorted and absent keys dropped, so the same update always gives the same text. */
export function canonicalPayloadJson(payload: PendingPayload): string {
  const entries = (Object.keys(payload) as (keyof PendingPayload)[])
    .filter((key) => payload[key] !== undefined)
    .sort()
    .map((key) => [key, payload[key]]);
  return JSON.stringify(entries);
}

/**
 * Identifies one open update. The same update received again is counted, not stored twice. The reason is left
 * out on purpose: a retry that now fails differently is still the same update.
 */
export function pendingDedupeKey(input: {
  leadIdHint: string | null;
  normalizedPhone: string | null;
  kind: PendingKind;
  payload: PendingPayload;
}): string {
  const material = JSON.stringify([input.leadIdHint ?? "", input.normalizedPhone ?? "", input.kind, canonicalPayloadJson(input.payload)]);
  return createHash("sha256").update(material).digest("hex");
}

/** The last write time of each field group of a lead. Null means no write is known for that group. */
export interface FieldFloors {
  status: Date | null;
  rating: Date | null;
}

/**
 * Where each field group of a lead was last written. A row written before the per-field times existed falls back
 * to updated_at, which is the conservative choice; a rating never written is no floor at all.
 */
export function fieldFloorsOf(record: {
  statusAt?: string | null;
  studentRatingAt?: string | null;
  studentRating: number | null;
  updatedAt: string;
}): FieldFloors {
  const status = record.statusAt ? new Date(record.statusAt) : new Date(record.updatedAt);
  const rating = record.studentRatingAt
    ? new Date(record.studentRatingAt)
    : record.studentRating !== null
      ? new Date(record.updatedAt)
      : null;
  return { status, rating };
}

/** Which field groups an update changes. A status update may also carry the payment amounts; a rating update carries only the rating. */
export function payloadParts(payload: PendingPayload): { status: boolean; rating: boolean } {
  return {
    status:
      payload.mainStatus !== undefined ||
      payload.secondaryStatus !== undefined ||
      payload.fullPaymentAmount !== undefined ||
      payload.partialPaymentAmount !== undefined,
    rating: payload.studentRating !== undefined,
  };
}

/** True when the lead's last write to this field group is at or after the update. Such an update is not applied. */
export function isSuperseded(floor: Date | null, sourceAt: Date): boolean {
  return floor !== null && floor.getTime() >= sourceAt.getTime();
}

/** An update is superseded when any field group it changes was written at or after its source time. */
export function isUpdateSuperseded(payload: PendingPayload, sourceAt: Date, floors: FieldFloors): boolean {
  const parts = payloadParts(payload);
  return (parts.status && isSuperseded(floors.status, sourceAt)) || (parts.rating && isSuperseded(floors.rating, sourceAt));
}
