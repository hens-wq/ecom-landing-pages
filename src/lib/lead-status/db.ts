import "server-only";

import { neon } from "@neondatabase/serverless";

/**
 * The ONLY place DATABASE_URL is read. Never logged, never echoed in any
 * error, never reaches a client component (this whole module is
 * server-only). Uses the Neon HTTP driver (@neondatabase/serverless) - each
 * query is a stateless HTTPS request, which is the right fit for Vercel's
 * serverless model: no connection pool to leak or exhaust across
 * invocations, and it works from the Node.js runtime this app already uses
 * everywhere else.
 */

export class LeadStatusDatabaseError extends Error {
  /** Non-sensitive technical detail (an error class name, never a message that could echo connection details) - safe to log. */
  detail?: string;

  constructor(message: string, detail?: string) {
    super(message);
    this.name = "LeadStatusDatabaseError";
    this.detail = detail;
  }
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

let sqlClient: ReturnType<typeof neon> | null = null;

function getSql(): ReturnType<typeof neon> {
  if (!isDatabaseConfigured()) {
    throw new LeadStatusDatabaseError(
      "מסד הנתונים אינו מוגדר (DATABASE_URL חסר). לא ניתן לשמור או לטעון סטטוסים.",
      "DATABASE_URL is not set"
    );
  }
  if (!sqlClient) {
    sqlClient = neon(process.env.DATABASE_URL!);
  }
  return sqlClient;
}

let schemaReadyPromise: Promise<void> | null = null;

/**
 * Idempotent: CREATE TABLE/INDEX and ADD COLUMN IF NOT EXISTS only - never drops, never
 * recreates, never touches existing rows. Memoized per warm server instance
 * so it only actually runs once per process, not once per request; a
 * failure clears the memo so the next call retries instead of caching a
 * permanent failure.
 */
export function ensureSchema(): Promise<void> {
  if (!schemaReadyPromise) {
    const sql = getSql();
    schemaReadyPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS lead_status (
          meta_lead_id text PRIMARY KEY,
          normalized_phone text,
          main_status text NOT NULL,
          secondary_status text NOT NULL,
          full_payment_amount numeric,
          partial_payment_amount numeric,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      // Additive/idempotent: historical rows remain unrated (NULL), never backfilled with an invented score.
      await sql`ALTER TABLE lead_status ADD COLUMN IF NOT EXISTS student_rating smallint CHECK (student_rating BETWEEN 1 AND 5)`;
      await sql`CREATE INDEX IF NOT EXISTS lead_status_normalized_phone_idx ON lead_status (normalized_phone)`;
      // CRM "דירוג תלמיד" (1-5 flames). Nullable, so existing rows are untouched.
      // Meta CRM feedback outbox: one row per lead and event type (see lib/crm-capi/outbox.ts).
      await sql`
        CREATE TABLE IF NOT EXISTS crm_capi_events (
          id bigserial PRIMARY KEY,
          lead_key text NOT NULL,
          event_type text NOT NULL CHECK (event_type IN ('qualified', 'registered')),
          event_id text NOT NULL,
          event_time timestamptz NOT NULL,
          status text NOT NULL DEFAULT 'pending'
            CHECK (status IN ('pending', 'sending', 'retry', 'sent', 'failed', 'skipped')),
          attempts integer NOT NULL DEFAULT 0,
          next_attempt_at timestamptz NOT NULL DEFAULT now(),
          claimed_until timestamptz,
          last_error text,
          sent_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT crm_capi_events_lead_event_key UNIQUE (lead_key, event_type)
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS crm_capi_events_due_idx ON crm_capi_events (status, next_attempt_at)`;
      // Fireberry status updates that no lead matched (see lib/lead-status/pending-core.ts). One row per open update.
      // Nothing is dropped: a row leaves "open" only by an explicit replay, a supersede or a dismissal.
      await sql`
        CREATE TABLE IF NOT EXISTS lead_status_pending (
          id bigserial PRIMARY KEY,
          dedupe_key text NOT NULL,
          status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'applied', 'superseded', 'dismissed')),
          reason text NOT NULL CHECK (reason IN ('not_found', 'ambiguous', 'invalid_phone', 'missing_identity', 'meta_unavailable')),
          kind text NOT NULL CHECK (kind IN ('status', 'rating')),
          lead_id_hint text,
          normalized_phone text,
          payload jsonb NOT NULL,
          first_received_at timestamptz NOT NULL DEFAULT now(),
          last_received_at timestamptz NOT NULL DEFAULT now(),
          received_count integer NOT NULL DEFAULT 1,
          attempts integer NOT NULL DEFAULT 0,
          last_checked_at timestamptz,
          last_error text,
          resolved_lead_id text,
          resolved_at timestamptz
        )
      `;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS lead_status_pending_open_key ON lead_status_pending (dedupe_key) WHERE status = 'open'`;
      await sql`CREATE INDEX IF NOT EXISTS lead_status_pending_received_idx ON lead_status_pending (status, last_received_at)`;
    })().catch((error) => {
      schemaReadyPromise = null;
      throw wrapDatabaseError(error, "שגיאה באתחול טבלת הסטטוסים במסד הנתונים.");
    });
  }
  return schemaReadyPromise;
}

/** Converts any raw driver error into a safe, Hebrew-messaged error - never re-throws or logs the original message, which could in rare cases echo connection details. */
export function wrapDatabaseError(error: unknown, message: string): LeadStatusDatabaseError {
  if (error instanceof LeadStatusDatabaseError) return error;
  const detail = error instanceof Error ? error.name : typeof error;
  return new LeadStatusDatabaseError(message, detail);
}

export function getSqlClient(): ReturnType<typeof neon> {
  return getSql();
}

export interface DatabaseHealth {
  connected: boolean;
  message?: string;
}

/** Used only for the Leads page's "מסד נתונים מחובר" indicator - never throws, always resolves. */
export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  if (!isDatabaseConfigured()) {
    return { connected: false, message: "מסד הנתונים אינו מוגדר (DATABASE_URL חסר)." };
  }
  try {
    await ensureSchema();
    const sql = getSql();
    await sql`SELECT 1`;
    return { connected: true };
  } catch (error) {
    const wrapped = wrapDatabaseError(error, "לא ניתן להתחבר למסד הנתונים.");
    return { connected: false, message: wrapped.message };
  }
}
