import "server-only";

import { readCrmCapiConfig, type CrmCapiConfig } from "@/lib/crm-capi/config";
import { buildCrmEvent, crmEventId } from "@/lib/crm-capi/event";
import {
  claimDueCrmEvents,
  enqueueCrmEvents,
  finishCrmEvent,
  type ClaimedCrmEvent,
  type NewCrmEvent,
} from "@/lib/crm-capi/outbox";
import { CRM_CLAIM_LEASE_SECONDS, retryDelaySeconds } from "@/lib/crm-capi/policy";
import { crmEventsForChange, type LeadQualitySnapshot } from "@/lib/crm-capi/rules";
import { sendCrmEvent, type FetchLike } from "@/lib/crm-capi/send";

/**
 * Meta CRM feedback, server side. The webhook queues events here, and a
 * separate step sends them. Nothing in this file can change a status, a
 * Fireberry update or a dashboard figure: failures are caught here and logged
 * by error name only.
 */

export interface CrmChange {
  /** The dashboard lead ID the status was stored under. */
  leadKey: string;
  /** Stored state before the update (undefined = no row yet). */
  previous: LeadQualitySnapshot | undefined;
  /** Stored state after the update. */
  next: LeadQualitySnapshot;
  /** The CRM's own time for the change, when it sent one. */
  statusChangedAt: Date | undefined;
  now: Date;
}

export interface FlushSummary {
  state: "disabled" | "ran";
  claimed: number;
  sent: number;
  retried: number;
  failed: number;
  skipped: number;
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}

/**
 * Queues the CRM events a change produces. Does nothing while sending is off,
 * so a change made then is never queued and switching sending on later cannot
 * send an old backlog. Returns how many events were queued.
 */
export async function recordCrmChange(change: CrmChange): Promise<number> {
  if (!readCrmCapiConfig().sendEnabled) return 0;

  const eventTypes = crmEventsForChange(change.previous, change.next);
  if (eventTypes.length === 0) return 0;

  const eventTime = change.statusChangedAt ?? change.now;
  const events: NewCrmEvent[] = eventTypes.map((eventType) => ({
    leadKey: change.leadKey,
    eventType,
    eventId: crmEventId(eventType, change.leadKey),
    eventTime,
  }));
  return enqueueCrmEvents(events, change.now);
}

/** Never throws, so a queueing failure cannot reach the webhook's reply. */
export async function recordCrmChangeSafely(change: CrmChange): Promise<void> {
  try {
    await recordCrmChange(change);
  } catch (error) {
    console.warn("[crm-capi] could not queue CRM events", { error: errorName(error) });
  }
}

type Outcome = "sent" | "retry" | "failed" | "skipped";

async function processOne(event: ClaimedCrmEvent, config: CrmCapiConfig, fetchImpl: FetchLike, now: Date): Promise<Outcome> {
  const built = buildCrmEvent({ eventType: event.eventType, metaLeadId: event.leadKey, eventTime: event.eventTime, now });
  if (!built.ok) {
    await finishCrmEvent(event.id, { status: "skipped", code: built.reason }, now);
    return "skipped";
  }

  const result = await sendCrmEvent(built.event, config, fetchImpl);
  if (result.ok) {
    await finishCrmEvent(event.id, { status: "sent" }, now);
    return "sent";
  }

  const delay = result.retryable ? retryDelaySeconds(event.attempts) : null;
  if (delay !== null) {
    await finishCrmEvent(event.id, { status: "retry", code: result.code, nextAttemptAt: new Date(now.getTime() + delay * 1000) }, now);
    return "retry";
  }
  await finishCrmEvent(event.id, { status: "failed", code: result.code }, now);
  return "failed";
}

/**
 * Sends the due events one at a time, oldest first. Rows are claimed under a
 * lease, so two workers never send the same row. A row that cannot be
 * processed or recorded is left for a later pass when its lease expires, and
 * the rest carry on.
 */
export async function flushCrmEvents(options: { limit: number; now: Date; fetchImpl: FetchLike }): Promise<FlushSummary> {
  const config = readCrmCapiConfig();
  const summary: FlushSummary = { state: "ran", claimed: 0, sent: 0, retried: 0, failed: 0, skipped: 0 };
  if (!config.sendEnabled) return { ...summary, state: "disabled" };

  const leaseUntil = new Date(options.now.getTime() + CRM_CLAIM_LEASE_SECONDS * 1000);
  const claimed = await claimDueCrmEvents(options.limit, options.now, leaseUntil);
  summary.claimed = claimed.length;

  for (const event of claimed) {
    try {
      const outcome = await processOne(event, config, options.fetchImpl, options.now);
      if (outcome === "sent") summary.sent += 1;
      else if (outcome === "retry") summary.retried += 1;
      else if (outcome === "failed") summary.failed += 1;
      else summary.skipped += 1;
    } catch (error) {
      console.warn("[crm-capi] event left for a later pass", { error: errorName(error) });
    }
  }

  console.info("[crm-capi] flush", { ...summary });
  return summary;
}

/** For the webhook's after() step. Never throws. */
export async function flushCrmEventsSafely(limit: number): Promise<void> {
  try {
    await flushCrmEvents({ limit, now: new Date(), fetchImpl: fetch });
  } catch (error) {
    console.warn("[crm-capi] flush failed", { error: errorName(error) });
  }
}
