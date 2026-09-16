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
 * Idempotent: CREATE TABLE/INDEX IF NOT EXISTS only - never drops, never
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
      await sql`CREATE INDEX IF NOT EXISTS lead_status_normalized_phone_idx ON lead_status (normalized_phone)`;
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
