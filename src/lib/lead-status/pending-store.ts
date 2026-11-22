import "server-only";

import {
  type NewPendingUpdate,
  type PendingKind,
  type PendingPayload,
  type PendingReason,
  type PendingRow,
  type PendingStatus,
  type PendingStore,
} from "@/lib/lead-status/pending-core";
import { ensureSchema, getSqlClient, wrapDatabaseError } from "@/lib/lead-status/db";

/**
 * Postgres side of the pending updates (table lead_status_pending, created by ensureSchema). A replay only changes
 * a row that is still open, so two runs cannot both settle the same update. Receipt times come from the database
 * clock, the same clock the status rows use. The completion-run lock is one row (lead_status_pending_run): a run
 * takes it with one conditional statement, so two runs can never hold it together.
 */

interface PendingDbRow {
  id: string | number;
  status: string;
  reason: string;
  kind: string;
  lead_id_hint: string | null;
  normalized_phone: string | null;
  payload: PendingPayload | null;
  source_at: string;
  first_received_at: string;
  last_received_at: string;
  received_count: number | string;
  attempts: number | string;
  last_checked_at: string | null;
  last_error: string | null;
  resolved_lead_id: string | null;
  resolved_at: string | null;
}

function mapRow(row: PendingDbRow): PendingRow {
  return {
    id: Number(row.id),
    status: row.status as PendingStatus,
    reason: row.reason as PendingReason,
    kind: row.kind as PendingKind,
    leadIdHint: row.lead_id_hint,
    normalizedPhone: row.normalized_phone,
    payload: row.payload ?? {},
    sourceAt: new Date(row.source_at),
    firstReceivedAt: new Date(row.first_received_at),
    lastReceivedAt: new Date(row.last_received_at),
    receivedCount: Number(row.received_count),
    attempts: Number(row.attempts),
    lastCheckedAt: row.last_checked_at === null ? null : new Date(row.last_checked_at),
    lastError: row.last_error,
    resolvedLeadId: row.resolved_lead_id,
    resolvedAt: row.resolved_at === null ? null : new Date(row.resolved_at),
  };
}

async function withSchema<T>(message: string, work: () => Promise<T>): Promise<T> {
  try {
    await ensureSchema();
    return await work();
  } catch (error) {
    throw wrapDatabaseError(error, message);
  }
}

const STATUSES: readonly PendingStatus[] = ["open", "applied", "superseded", "dismissed"];

export const pendingStore: PendingStore = {
  async insert(input: NewPendingUpdate) {
    return withSchema("שגיאה בשמירת העדכון הממתין במסד הנתונים. העדכון לא נשמר.", async () => {
      const sql = getSqlClient();
      // A new row counts as checked at receipt, so the retry waits before it looks at the row again.
      const rows = (await sql`
        INSERT INTO lead_status_pending (dedupe_key, reason, kind, lead_id_hint, normalized_phone, payload, source_at, last_checked_at)
        VALUES (${input.dedupeKey}, ${input.reason}, ${input.kind}, ${input.leadIdHint}, ${input.normalizedPhone}, ${JSON.stringify(input.payload)}::jsonb, ${input.sourceAt.toISOString()}::timestamptz, now())
        ON CONFLICT (dedupe_key) WHERE status = 'open'
        DO UPDATE SET received_count = lead_status_pending.received_count + 1,
                      last_received_at = now(),
                      source_at = GREATEST(lead_status_pending.source_at, EXCLUDED.source_at),
                      reason = EXCLUDED.reason
        RETURNING id, (xmax = 0) AS inserted
      `) as { id: string | number; inserted: boolean }[];
      return { id: Number(rows[0].id), inserted: rows[0].inserted === true };
    });
  },

  async listOpen(limit: number) {
    return withSchema("שגיאה בטעינת העדכונים הממתינים ממסד הנתונים.", async () => {
      const sql = getSqlClient();
      const rows = (await sql`
        SELECT * FROM lead_status_pending
        WHERE status = 'open'
        ORDER BY source_at, id
        LIMIT ${limit}
      `) as PendingDbRow[];
      return rows.map(mapRow);
    });
  },

  async listRetryable(limit: number) {
    return withSchema("שגיאה בטעינת העדכונים הממתינים ממסד הנתונים.", async () => {
      const sql = getSqlClient();
      const rows = (await sql`
        SELECT * FROM lead_status_pending
        WHERE status = 'open'
          AND (last_checked_at IS NULL OR last_checked_at < now() - interval '10 minutes')
        ORDER BY source_at, id
        LIMIT ${limit}
      `) as PendingDbRow[];
      return rows.map(mapRow);
    });
  },

  async list(status: PendingStatus | "all", limit: number) {
    return withSchema("שגיאה בטעינת העדכונים הממתינים ממסד הנתונים.", async () => {
      const sql = getSqlClient();
      const rows =
        status === "all"
          ? ((await sql`SELECT * FROM lead_status_pending ORDER BY last_received_at DESC, id DESC LIMIT ${limit}`) as PendingDbRow[])
          : ((await sql`SELECT * FROM lead_status_pending WHERE status = ${status} ORDER BY last_received_at DESC, id DESC LIMIT ${limit}`) as PendingDbRow[]);
      return rows.map(mapRow);
    });
  },

  async countByStatus() {
    return withSchema("שגיאה בספירת העדכונים הממתינים ממסד הנתונים.", async () => {
      const sql = getSqlClient();
      const rows = (await sql`SELECT status, count(*)::int AS n FROM lead_status_pending GROUP BY status`) as { status: string; n: number }[];
      const counts = Object.fromEntries(STATUSES.map((status) => [status, 0])) as Record<PendingStatus, number>;
      for (const row of rows) {
        if (row.status in counts) counts[row.status as PendingStatus] = Number(row.n);
      }
      return counts;
    });
  },

  async get(id: number) {
    return withSchema("שגיאה בטעינת העדכון הממתין ממסד הנתונים.", async () => {
      const sql = getSqlClient();
      const rows = (await sql`SELECT * FROM lead_status_pending WHERE id = ${id}`) as PendingDbRow[];
      return rows[0] ? mapRow(rows[0]) : undefined;
    });
  },

  async markChecked(id: number, code: string) {
    await withSchema("שגיאה בעדכון העדכון הממתין במסד הנתונים.", async () => {
      const sql = getSqlClient();
      await sql`
        UPDATE lead_status_pending
        SET attempts = attempts + 1, last_checked_at = now(), last_error = ${code}
        WHERE id = ${id} AND status = 'open'
      `;
    });
  },

  async markApplied(id: number, leadId: string) {
    await withSchema("שגיאה בעדכון העדכון הממתין במסד הנתונים.", async () => {
      const sql = getSqlClient();
      await sql`
        UPDATE lead_status_pending
        SET status = 'applied', resolved_lead_id = ${leadId}, resolved_at = now(),
            attempts = attempts + 1, last_checked_at = now(), last_error = NULL
        WHERE id = ${id} AND status = 'open'
      `;
    });
  },

  async markSuperseded(id: number, leadId: string) {
    await withSchema("שגיאה בעדכון העדכון הממתין במסד הנתונים.", async () => {
      const sql = getSqlClient();
      await sql`
        UPDATE lead_status_pending
        SET status = 'superseded', resolved_lead_id = ${leadId}, resolved_at = now(),
            attempts = attempts + 1, last_checked_at = now(), last_error = 'newer_write_exists'
        WHERE id = ${id} AND status = 'open'
      `;
    });
  },

  async markDismissed(id: number) {
    await withSchema("שגיאה בעדכון העדכון הממתין במסד הנתונים.", async () => {
      const sql = getSqlClient();
      await sql`
        UPDATE lead_status_pending
        SET status = 'dismissed', resolved_at = now(), last_checked_at = now(), last_error = 'dismissed_by_admin'
        WHERE id = ${id} AND status = 'open'
      `;
    });
  },

  async tryAcquireRun(holder: string, leaseSeconds: number) {
    return withSchema("שגיאה בנעילת הרצת ההשלמה במסד הנתונים.", async () => {
      const sql = getSqlClient();
      // One statement: the row is taken only when it is free, or its lease has ended. Two runs cannot both get it.
      const rows = (await sql`
        INSERT INTO lead_status_pending_run (id, holder, locked_until)
        VALUES (1, ${holder}, now() + (${leaseSeconds}::int * interval '1 second'))
        ON CONFLICT (id) DO UPDATE SET holder = EXCLUDED.holder, locked_until = EXCLUDED.locked_until
        WHERE lead_status_pending_run.locked_until < now()
        RETURNING holder
      `) as { holder: string }[];
      return rows[0]?.holder === holder;
    });
  },

  async releaseRun(holder: string) {
    await withSchema("שגיאה בשחרור נעילת הרצת ההשלמה במסד הנתונים.", async () => {
      const sql = getSqlClient();
      await sql`UPDATE lead_status_pending_run SET locked_until = now() WHERE id = 1 AND holder = ${holder}`;
    });
  },

  async openSummary() {
    return withSchema("שגיאה בטעינת סיכום העדכונים הממתינים ממסד הנתונים.", async () => {
      const sql = getSqlClient();
      const rows = (await sql`
        SELECT reason, count(*)::int AS n, min(source_at) AS oldest
        FROM lead_status_pending
        WHERE status = 'open'
        GROUP BY reason
        ORDER BY reason
      `) as { reason: PendingReason; n: number; oldest: string | Date }[];
      return rows.map((row) => ({ reason: row.reason, count: Number(row.n), oldestSourceAt: new Date(row.oldest) }));
    });
  },
};
