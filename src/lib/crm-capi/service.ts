import "server-only";

import { readCrmCapiConfig } from "@/lib/crm-capi/config";
import { claimDueCrmEvents, enqueueCrmEvents, finishCrmEvent } from "@/lib/crm-capi/outbox";
import {
  flushCrmEvents as runFlush,
  recordCrmChange as runRecord,
  type CrmChange,
  type CrmMetaLogEntry,
  type FlushSummary,
} from "@/lib/crm-capi/pipeline";

/**
 * Meta CRM feedback, server side: binds the pipeline to Postgres and to the
 * environment. Nothing here changes a status, a Fireberry update or a dashboard
 * figure. Only error names, counts and Meta's sanitized answer are logged, never event data.
 */

export type { CrmChange, FlushSummary };

const liveOutbox = { enqueue: enqueueCrmEvents, claim: claimDueCrmEvents, finish: finishCrmEvent };

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}

/** One line per Meta answer: HTTP status, events_received, messages, fbtrace_id and the destination Dataset ID. Never the token, the URL, the request body or a lead ID. */
function logMetaReport(entry: CrmMetaLogEntry): void {
  console.info("[crm-capi] meta response", entry);
}

/** Called by the webhook. Never throws, so a queueing failure cannot reach the webhook's reply. */
export async function recordCrmChangeSafely(change: CrmChange): Promise<void> {
  try {
    await runRecord(change, { sendEnabled: readCrmCapiConfig().sendEnabled, outbox: liveOutbox });
  } catch (error) {
    console.warn("[crm-capi] could not queue CRM events", { error: errorName(error) });
  }
}

/** Called by the flush route. Throws on database errors, so the route can answer 503 or 500. */
export async function flushCrmEvents(options: { limit: number; now: Date }): Promise<FlushSummary> {
  const summary = await runFlush(options, { config: readCrmCapiConfig(), outbox: liveOutbox, fetchImpl: fetch, onMetaReport: logMetaReport });
  if (summary.state === "ran") console.info("[crm-capi] flush", { ...summary });
  return summary;
}

/** Called by the webhook's after() step. Never throws, and does nothing while sending is off. */
export async function flushCrmEventsSafely(limit: number): Promise<void> {
  try {
    await flushCrmEvents({ limit, now: new Date() });
  } catch (error) {
    console.warn("[crm-capi] flush failed", { error: errorName(error) });
  }
}
