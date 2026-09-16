import "server-only";

import { neon } from "@neondatabase/serverless";

/**
 * Mirrors lib/lead-status/db.ts exactly (same DATABASE_URL, same Neon HTTP
 * driver, same "never log a raw driver error" discipline) - deliberately not
 * shared code with that module because the two tables are independent and
 * this one should be free to evolve (or be dropped/rebuilt) without any risk
 * to lead_status's own schema.
 */

export class LandingLeadsDatabaseError extends Error {
  /** Non-sensitive technical detail (an error class name, never a message that could echo connection details) - safe to log. */
  detail?: string;

  constructor(message: string, detail?: string) {
    super(message);
    this.name = "LandingLeadsDatabaseError";
    this.detail = detail;
  }
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

let sqlClient: ReturnType<typeof neon> | null = null;

function getSql(): ReturnType<typeof neon> {
  if (!isDatabaseConfigured()) {
    throw new LandingLeadsDatabaseError(
      "מסד הנתונים אינו מוגדר (DATABASE_URL חסר). לא ניתן לשמור או לטעון לידים מדף נחיתה.",
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
 * recreates, never touches existing rows. Memoized per warm server instance;
 * a failure clears the memo so the next call retries instead of caching a
 * permanent failure.
 *
 * `internal_lead_id` is generated in application code (crypto.randomUUID(),
 * see repository.ts), not by a Postgres default - avoids depending on the
 * pgcrypto/uuid-ossp extension being enabled on this Neon project.
 */
export function ensureSchema(): Promise<void> {
  if (!schemaReadyPromise) {
    const sql = getSql();
    schemaReadyPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS leads (
          internal_lead_id text PRIMARY KEY,
          lead_source text NOT NULL CHECK (lead_source IN ('meta_standard_form', 'meta_rich_form', 'landing_page')),
          meta_lead_id text UNIQUE,
          name text,
          phone text,
          normalized_phone text,
          email text,
          campaign_id text,
          adset_id text,
          ad_id text,
          landing_page_url text,
          utm_source text,
          utm_medium text,
          utm_campaign text,
          utm_content text,
          utm_term text,
          fbclid text,
          placement text,
          site_source text,
          submitted_at timestamptz NOT NULL DEFAULT now(),
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS leads_normalized_phone_idx ON leads (normalized_phone)`;
      await sql`CREATE INDEX IF NOT EXISTS leads_submitted_at_idx ON leads (submitted_at)`;
      await sql`CREATE INDEX IF NOT EXISTS leads_lead_source_idx ON leads (lead_source)`;
    })().catch((error) => {
      schemaReadyPromise = null;
      throw wrapDatabaseError(error, "שגיאה באתחול טבלת הלידים במסד הנתונים.");
    });
  }
  return schemaReadyPromise;
}

/** Converts any raw driver error into a safe, Hebrew-messaged error - never re-throws or logs the original message, which could in rare cases echo connection details. */
export function wrapDatabaseError(error: unknown, message: string): LandingLeadsDatabaseError {
  if (error instanceof LandingLeadsDatabaseError) return error;
  const detail = error instanceof Error ? error.name : typeof error;
  return new LandingLeadsDatabaseError(message, detail);
}

export function getSqlClient(): ReturnType<typeof neon> {
  return getSql();
}
