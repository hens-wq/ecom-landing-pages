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
 * Postgres side of the pending updates (table lead_status_pending, created by ensureSchema). Only a row that is
 * still open is ever changed by a replay, so two runs cannot both settle the same update. Timestamps come from
 * the database clock, the same clock the status rows use.
 */

interface PendingDbRow {
  id: string | number;
  status: string;
  reason: string;
  kind: string;
  lead_id_hint: string | null;
  normalized_phone: string | null;
  payload: PendingPayload | null;
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
      const rows = (await sql`
        INSERT INTO lead_status_pending (dedupe_key, reason, kind, lead_id_hint, normalized_phone, payload)
        VALUES (${input.dedupeKey}, ${input.reason}, ${input.kind}, ${input.leadIdHint}, ${input.normalizedPhone}, ${JSON.stringify(input.payload)}::jsonb)
        ON CONFLICT (dedupe_key) WHERE status = 'open'
        DO UPDATE SET received_count = lead_status_pending.received_count + 1,
                      last_received_at = now(),
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
        ORDER BY last_received_at, id
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
};
