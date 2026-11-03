import "server-only";

import { getSqlClient, isDatabaseConfigured } from "@/lib/lead-status/db";

/**
 * Storage for optimization runs. Uses the app's existing Neon database and adds two tables to it. Nothing is dropped,
 * and existing tables are never touched: every statement is CREATE ... IF NOT EXISTS.
 */

export class OptimizationDatabaseError extends Error {
  /** Non-sensitive technical detail (an error class name), safe to log. Never a connection string. */
  detail?: string;

  constructor(message: string, detail?: string) {
    super(message);
    this.name = "OptimizationDatabaseError";
    this.detail = detail;
  }
}

export function assertDatabaseConfigured(): void {
  if (!isDatabaseConfigured()) {
    throw new OptimizationDatabaseError(
      "מסד הנתונים אינו מוגדר (DATABASE_URL חסר). לא ניתן לשמור דוח אופטימיזציה.",
      "DATABASE_URL is not set"
    );
  }
}

let schemaReady: Promise<void> | null = null;

/** Memoized per warm instance. A failure clears the memo, so the next call retries instead of caching the failure. */
export function ensureOptimizationSchema(): Promise<void> {
  if (!schemaReady) {
    assertDatabaseConfigured();
    const sql = getSqlClient();
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS optimization_runs (
          run_id text PRIMARY KEY,
          created_at timestamptz NOT NULL,
          summary jsonb NOT NULL,
          record jsonb NOT NULL
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS optimization_runs_created_idx ON optimization_runs (created_at DESC)`;
      await sql`
        CREATE TABLE IF NOT EXISTS optimization_recommendation_status (
          run_id text NOT NULL,
          recommendation_id text NOT NULL,
          status text NOT NULL CHECK (status IN ('pending', 'done', 'not_done')),
          updated_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (run_id, recommendation_id)
        )
      `;
    })().catch((error: unknown) => {
      schemaReady = null;
      throw wrapOptimizationError(error, "שגיאה באתחול טבלאות האופטימיזציה במסד הנתונים.");
    });
  }
  return schemaReady;
}

/** Turns any driver error into a Hebrew, user-safe error. The original message is never copied, since it could echo connection details. */
export function wrapOptimizationError(error: unknown, message: string): OptimizationDatabaseError {
  if (error instanceof OptimizationDatabaseError) return error;
  const detail = error instanceof Error ? error.name : typeof error;
  return new OptimizationDatabaseError(message, detail);
}

export function optimizationSql(): ReturnType<typeof getSqlClient> {
  return getSqlClient();
}
