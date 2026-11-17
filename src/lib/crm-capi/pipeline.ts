import type { CrmCapiConfig } from "@/lib/crm-capi/config";
import { buildCrmEvent, crmEventId } from "@/lib/crm-capi/event";
import { CRM_CLAIM_LEASE_SECONDS, retryDelaySeconds } from "@/lib/crm-capi/policy";
import { crmEventsForRecord, isRecentLead, type CrmEventType, type LeadQualitySnapshot } from "@/lib/crm-capi/rules";
import { sendCrmEvent, type CrmMetaReport, type FetchLike } from "@/lib/crm-capi/send";

/**
 * Meta CRM feedback pipeline. Pure: every database call and every network call
 * arrives through `deps`, so the whole path (status change -> outbox -> Meta
 * payload) runs in memory in the tests. Nothing here can change a status, a
 * Fireberry update or a dashboard figure.
 */

export interface NewCrmEvent {
  leadKey: string;
  eventType: CrmEventType;
  eventId: string;
  eventTime: Date;
}

export interface ClaimedCrmEvent {
  id: number;
  leadKey: string;
  eventType: CrmEventType;
  eventId: string;
  eventTime: Date;
  /** Attempts made so far, including the one this claim starts. */
  attempts: number;
}

export type CrmEventOutcome =
  | { status: "sent" }
  | { status: "retry"; code: string; nextAttemptAt: Date }
  | { status: "failed"; code: string }
  | { status: "skipped"; code: string };

/** The outbox operations the pipeline needs. The Postgres implementation is in outbox.ts. */
export interface CrmOutbox {
  enqueue(events: NewCrmEvent[], now: Date): Promise<number>;
  claim(limit: number, now: Date, leaseUntil: Date): Promise<ClaimedCrmEvent[]>;
  finish(id: number, outcome: CrmEventOutcome, now: Date): Promise<void>;
}

export interface CrmChange {
  /** The dashboard lead ID the status was stored under. */
  leadKey: string;
  /** Stored state before the update (undefined = no row yet). */
  previous: LeadQualitySnapshot | undefined;
  /** Stored state after the update. */
  next: LeadQualitySnapshot;
  /** The CRM's own time for the change, when it sent one. */
  statusChangedAt: Date | undefined;
  /** Calendar date (YYYY-MM-DD) the lead was created, when the dashboard knows it. */
  leadCreatedDate?: string;
  now: Date;
}

/**
 * The event time Meta receives. Meta needs event_time after the lead exists, so
 * a CRM timestamp from before the lead's creation day is replaced by the arrival
 * time. One day of slack covers the Israel time zone.
 */
export function eventTimeFor(change: Pick<CrmChange, "statusChangedAt" | "leadCreatedDate" | "now">): Date {
  if (!change.statusChangedAt) return change.now;
  if (change.leadCreatedDate) {
    const earliest = Date.parse(`${change.leadCreatedDate}T00:00:00Z`) - 24 * 60 * 60 * 1000;
    if (Number.isFinite(earliest) && change.statusChangedAt.getTime() < earliest) return change.now;
  }
  return change.statusChangedAt;
}

export interface RecordDeps {
  sendEnabled: boolean;
  outbox: Pick<CrmOutbox, "enqueue">;
}

/**
 * Queues the CRM events a change produces. Queues nothing while sending is off,
 * so a change made then is never queued and switching sending on later cannot
 * send an old backlog. A lead's first sighting also queues its raw lead, while
 * the lead is recent (see crmEventsForRecord). Returns how many events were queued.
 */
export async function recordCrmChange(change: CrmChange, deps: RecordDeps): Promise<number> {
  if (!deps.sendEnabled) return 0;

  const eventTypes = crmEventsForRecord(change.previous, change.next, isRecentLead(change.leadCreatedDate, change.now));
  if (eventTypes.length === 0) return 0;

  const eventTime = eventTimeFor(change);
  const events: NewCrmEvent[] = eventTypes.map((eventType) => ({
    leadKey: change.leadKey,
    eventType,
    eventId: crmEventId(eventType, change.leadKey),
    eventTime,
  }));
  return deps.outbox.enqueue(events, change.now);
}

export interface FlushSummary {
  state: "disabled" | "ran";
  claimed: number;
  sent: number;
  retried: number;
  failed: number;
  skipped: number;
  /** Rows that could not be processed or recorded. Their lease expires and a later pass takes them again. */
  deferred: number;
}

/** What the log gets for each Meta answer: Meta's sanitized report, the event name and the destination Dataset ID. */
export type CrmMetaLogEntry = CrmMetaReport & { eventName: string; datasetId: string | null };

export interface FlushDeps {
  config: CrmCapiConfig;
  outbox: Pick<CrmOutbox, "claim" | "finish">;
  fetchImpl: FetchLike;
  /** Receives Meta's answer to each send, for logging. Optional, and it cannot change the outcome. */
  onMetaReport?: (entry: CrmMetaLogEntry) => void;
}

async function processOne(event: ClaimedCrmEvent, deps: FlushDeps, now: Date): Promise<"sent" | "retry" | "failed" | "skipped"> {
  const built = buildCrmEvent({ eventType: event.eventType, metaLeadId: event.leadKey, eventTime: event.eventTime, now });
  if (!built.ok) {
    await deps.outbox.finish(event.id, { status: "skipped", code: built.reason }, now);
    return "skipped";
  }

  const eventName = built.event.event_name;
  const result = await sendCrmEvent(built.event, deps.config, deps.fetchImpl, (report) =>
    deps.onMetaReport?.({ ...report, eventName, datasetId: deps.config.datasetId })
  );
  if (result.ok) {
    await deps.outbox.finish(event.id, { status: "sent" }, now);
    return "sent";
  }

  const delay = result.retryable ? retryDelaySeconds(event.attempts) : null;
  if (delay !== null) {
    await deps.outbox.finish(event.id, { status: "retry", code: result.code, nextAttemptAt: new Date(now.getTime() + delay * 1000) }, now);
    return "retry";
  }
  await deps.outbox.finish(event.id, { status: "failed", code: result.code }, now);
  return "failed";
}

/**
 * Sends the due events one at a time, oldest first. Rows are claimed under a
 * lease, so two workers never send the same row. A row whose processing or
 * recording throws is counted as deferred and the rest carry on.
 */
export async function flushCrmEvents(options: { limit: number; now: Date }, deps: FlushDeps): Promise<FlushSummary> {
  const summary: FlushSummary = { state: "ran", claimed: 0, sent: 0, retried: 0, failed: 0, skipped: 0, deferred: 0 };
  if (!deps.config.sendEnabled) return { ...summary, state: "disabled" };

  const leaseUntil = new Date(options.now.getTime() + CRM_CLAIM_LEASE_SECONDS * 1000);
  const claimed = await deps.outbox.claim(options.limit, options.now, leaseUntil);
  summary.claimed = claimed.length;

  for (const event of claimed) {
    try {
      const outcome = await processOne(event, deps, options.now);
      if (outcome === "sent") summary.sent += 1;
      else if (outcome === "retry") summary.retried += 1;
      else if (outcome === "failed") summary.failed += 1;
      else summary.skipped += 1;
    } catch {
      summary.deferred += 1;
    }
  }
  return summary;
}
