/**
 * Pending Fireberry status updates: an update the webhook could not apply because no lead matched (or
 * the match was ambiguous, or the phone was unusable). It is kept here, so nothing is lost silently, and
 * the admin replay completes it once the dashboard knows the lead. Pure: the database lives in
 * pending-store.ts, the replay logic in pending-replay.ts.
 */
import { createHash } from "node:crypto";

import type { LeadQualitySnapshot } from "@/lib/crm-capi/rules";
import type { StudentRating } from "@/lib/lead-status/student-rating";

export type PendingStatus = "open" | "applied" | "superseded" | "dismissed";
export type PendingReason = "not_found" | "ambiguous" | "invalid_phone" | "missing_identity" | "meta_unavailable";
export type PendingKind = "status" | "rating";

/**
 * The update as the webhook would have applied it. A key that was not sent stays absent: "not sent" keeps
 * the stored value, while an explicit null clears it.
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
}

export interface PendingStore {
  /** Stores the update, or counts one more receipt when the same update is still open. */
  insert(input: NewPendingUpdate): Promise<{ id: number; inserted: boolean }>;
  listOpen(limit: number): Promise<PendingRow[]>;
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
 * Identifies one open update. The same request received again is counted, not stored twice. The reason is
 * left out on purpose: a retry that now fails differently is still the same update.
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

/**
 * True when the lead changed at or after this update was received. Applying the older update then would
 * overwrite a newer write, so it is kept on record as superseded instead.
 */
export function isSuperseded(leadUpdatedAt: Date | null, receivedAt: Date): boolean {
  return leadUpdatedAt !== null && leadUpdatedAt.getTime() >= receivedAt.getTime();
}
