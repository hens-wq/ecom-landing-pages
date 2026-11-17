import "server-only";

import type { ClaimedCrmEvent, CrmEventOutcome, NewCrmEvent } from "@/lib/crm-capi/pipeline";
import type { CrmEventType } from "@/lib/crm-capi/rules";
import { ensureSchema, getSqlClient, wrapDatabaseError } from "@/lib/lead-status/db";

/**
 * The CRM event outbox: table crm_capi_events, created by ensureSchema in
 * lib/lead-status/db.ts. One row per lead and event type. The unique key is
 * what keeps a lead to one qualified and one registered event however many
 * webhooks arrive. Rows are written before any Meta call, so a Meta failure
 * cannot lose an event or touch the status update that produced it.
 *
 * Only short codes go into last_error: never Meta's message, a URL or a token.
 */

interface ClaimedRow {
  id: string | number;
  lead_key: string;
  event_type: string;
  event_id: string;
  event_time: string;
  attempts: number | string;
}

/** Queues events. A repeat for the same lead and type is ignored. Returns how many rows were new. */
export async function enqueueCrmEvents(events: NewCrmEvent[], now: Date): Promise<number> {
  if (events.length === 0) return 0;
  try {
    await ensureSchema();
    const sql = getSqlClient();
    let queued = 0;
    for (const event of events) {
      const rows = (await sql`
        INSERT INTO crm_capi_events (lead_key, event_type, event_id, event_time, status, next_attempt_at)
        VALUES (${event.leadKey}, ${event.eventType}, ${event.eventId}, ${event.eventTime.toISOString()}::timestamptz, 'pending', ${now.toISOString()}::timestamptz)
        ON CONFLICT (lead_key, event_type) DO NOTHING
        RETURNING id
      `) as { id: string | number }[];
      queued += rows.length;
    }
    return queued;
  } catch (error) {
    throw wrapDatabaseError(error, "שגיאה ברישום אירועי CRM לשליחה במסד הנתונים.");
  }
}

/**
 * Claims due rows and takes a lease on them, so two workers never claim the
 * same row. SKIP LOCKED means a busy row is passed over, never waited on.
 */
export async function claimDueCrmEvents(limit: number, now: Date, leaseUntil: Date): Promise<ClaimedCrmEvent[]> {
  try {
    await ensureSchema();
    const sql = getSqlClient();
    const nowIso = now.toISOString();
    const rows = (await sql`
      UPDATE crm_capi_events
      SET status = 'sending',
          attempts = attempts + 1,
          claimed_until = ${leaseUntil.toISOString()}::timestamptz,
          updated_at = now()
      WHERE id IN (
        SELECT id FROM crm_capi_events
        WHERE (status IN ('pending', 'retry') AND next_attempt_at <= ${nowIso}::timestamptz)
           OR (status = 'sending' AND claimed_until < ${nowIso}::timestamptz)
        ORDER BY id
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, lead_key, event_type, event_id, event_time, attempts
    `) as ClaimedRow[];

    return rows.map((row) => ({
      id: Number(row.id),
      leadKey: row.lead_key,
      // The CHECK constraint on event_type allows only the three stages.
      eventType: row.event_type as CrmEventType,
      eventId: row.event_id,
      eventTime: new Date(row.event_time),
      attempts: Number(row.attempts),
    }));
  } catch (error) {
    throw wrapDatabaseError(error, "שגיאה בטעינת אירועי CRM הממתינים לשליחה.");
  }
}

export async function finishCrmEvent(id: number, outcome: CrmEventOutcome, now: Date): Promise<void> {
  try {
    await ensureSchema();
    const sql = getSqlClient();
    if (outcome.status === "sent") {
      await sql`
        UPDATE crm_capi_events
        SET status = 'sent', sent_at = ${now.toISOString()}::timestamptz, claimed_until = NULL, last_error = NULL, updated_at = now()
        WHERE id = ${id}
      `;
    } else if (outcome.status === "retry") {
      await sql`
        UPDATE crm_capi_events
        SET status = 'retry', next_attempt_at = ${outcome.nextAttemptAt.toISOString()}::timestamptz,
            claimed_until = NULL, last_error = ${outcome.code}, updated_at = now()
        WHERE id = ${id}
      `;
    } else {
      await sql`
        UPDATE crm_capi_events
        SET status = ${outcome.status}, claimed_until = NULL, last_error = ${outcome.code}, updated_at = now()
        WHERE id = ${id}
      `;
    }
  } catch (error) {
    throw wrapDatabaseError(error, "שגיאה בעדכון אירוע CRM במסד הנתונים.");
  }
}
