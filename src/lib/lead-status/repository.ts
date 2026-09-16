import "server-only";

import { ensureSchema, getSqlClient, wrapDatabaseError } from "@/lib/lead-status/db";
import type { LeadStatusRecord, MainStatus } from "@/lib/lead-status/types";

/**
 * Backed by Neon Postgres (see db.ts) - a `lead_status` table, one row per
 * Meta Lead ID:
 *
 *   CREATE TABLE lead_status (
 *     meta_lead_id           text PRIMARY KEY,   -- Meta Lead ID - the only real key
 *     normalized_phone       text,               -- secondary matching aid only, never a key
 *     main_status            text NOT NULL,
 *     secondary_status       text NOT NULL,
 *     full_payment_amount    numeric,
 *     partial_payment_amount numeric,
 *     created_at             timestamptz NOT NULL DEFAULT now(),
 *     updated_at             timestamptz NOT NULL DEFAULT now()
 *   );
 *
 * Created idempotently by ensureSchema() (db.ts) - IF NOT EXISTS only, never
 * dropped/recreated, existing rows are never touched by migration.
 */

export interface LeadStatusUpsertPatch {
  mainStatus: string;
  secondaryStatus: string;
  /** Undefined = "not being changed by this update" (falls back to the existing stored value); null = "explicitly cleared". */
  normalizedPhone?: string | null;
  fullPaymentAmount?: number | null;
  partialPaymentAmount?: number | null;
}

export interface LeadStatusRepository {
  get(leadId: string): Promise<LeadStatusRecord | undefined>;
  /** Batch read for however many lead IDs are currently loaded on the Leads page - avoids one query per row. */
  getMany(leadIds: string[]): Promise<Map<string, LeadStatusRecord>>;
  upsert(leadId: string, patch: LeadStatusUpsertPatch): Promise<LeadStatusRecord>;
}

interface LeadStatusRow {
  meta_lead_id: string;
  normalized_phone: string | null;
  main_status: string;
  secondary_status: string;
  full_payment_amount: string | number | null;
  partial_payment_amount: string | number | null;
  updated_at: string;
}

/** Postgres NUMERIC columns come back as strings (to avoid float precision loss on the wire) - this is the one place that converts back to a JS number. */
function parseAmount(value: string | number | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapRow(row: LeadStatusRow): LeadStatusRecord {
  return {
    leadId: row.meta_lead_id,
    normalizedPhone: row.normalized_phone,
    mainStatus: row.main_status as MainStatus,
    secondaryStatus: row.secondary_status,
    fullPaymentAmount: parseAmount(row.full_payment_amount),
    partialPaymentAmount: parseAmount(row.partial_payment_amount),
    updatedAt: row.updated_at,
  };
}

const UPSERT_SQL = `
  INSERT INTO lead_status (meta_lead_id, normalized_phone, main_status, secondary_status, full_payment_amount, partial_payment_amount, created_at, updated_at)
  VALUES ($1, $2, $3, $4, $5, $6, now(), now())
  ON CONFLICT (meta_lead_id) DO UPDATE SET
    normalized_phone = EXCLUDED.normalized_phone,
    main_status = EXCLUDED.main_status,
    secondary_status = EXCLUDED.secondary_status,
    full_payment_amount = EXCLUDED.full_payment_amount,
    partial_payment_amount = EXCLUDED.partial_payment_amount,
    updated_at = now()
  RETURNING *
`;

class PostgresLeadStatusRepository implements LeadStatusRepository {
  async get(leadId: string): Promise<LeadStatusRecord | undefined> {
    try {
      await ensureSchema();
      const sql = getSqlClient();
      const rows = (await sql`SELECT * FROM lead_status WHERE meta_lead_id = ${leadId}`) as LeadStatusRow[];
      return rows[0] ? mapRow(rows[0]) : undefined;
    } catch (error) {
      throw wrapDatabaseError(error, "שגיאה בטעינת סטטוס הליד ממסד הנתונים.");
    }
  }

  async getMany(leadIds: string[]): Promise<Map<string, LeadStatusRecord>> {
    const result = new Map<string, LeadStatusRecord>();
    if (leadIds.length === 0) return result;
    try {
      await ensureSchema();
      const sql = getSqlClient();
      const rows = (await sql`SELECT * FROM lead_status WHERE meta_lead_id = ANY(${leadIds})`) as LeadStatusRow[];
      for (const row of rows) {
        const record = mapRow(row);
        result.set(record.leadId, record);
      }
      return result;
    } catch (error) {
      throw wrapDatabaseError(error, "שגיאה בטעינת סטטוסי הלידים ממסד הנתונים.");
    }
  }

  /**
   * Reads the existing row first so undefined patch fields keep their
   * stored value (see LeadStatusUpsertPatch), then writes the fully
   * resolved record. Not atomic against a concurrent edit of the SAME lead
   * by two people at the exact same instant - an accepted tradeoff for a
   * small internal tool where that's extremely unlikely, not engineered
   * around with optimistic locking here.
   */
  async upsert(leadId: string, patch: LeadStatusUpsertPatch): Promise<LeadStatusRecord> {
    try {
      await ensureSchema();
      const sql = getSqlClient();

      const existing = await this.get(leadId);

      const normalizedPhone = patch.normalizedPhone !== undefined ? patch.normalizedPhone : (existing?.normalizedPhone ?? null);
      const fullPaymentAmount =
        patch.fullPaymentAmount !== undefined ? patch.fullPaymentAmount : (existing?.fullPaymentAmount ?? null);
      const partialPaymentAmount =
        patch.partialPaymentAmount !== undefined ? patch.partialPaymentAmount : (existing?.partialPaymentAmount ?? null);

      const rows = (await sql.query(UPSERT_SQL, [
        leadId,
        normalizedPhone,
        patch.mainStatus,
        patch.secondaryStatus,
        fullPaymentAmount,
        partialPaymentAmount,
      ])) as LeadStatusRow[];

      return mapRow(rows[0]);
    } catch (error) {
      throw wrapDatabaseError(error, "שגיאה בשמירת הסטטוס במסד הנתונים. הנתונים לא נשמרו.");
    }
  }
}

const sharedRepository = new PostgresLeadStatusRepository();

/** Single point every caller goes through. */
export function getLeadStatusRepository(): LeadStatusRepository {
  return sharedRepository;
}
