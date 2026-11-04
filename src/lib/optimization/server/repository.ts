import "server-only";

import type { ActionStatus } from "@/lib/optimization/labels";
import type { RunRecord, RunSummary } from "@/lib/optimization/run";
import type { SonilImportRecord } from "@/lib/optimization/sonil/types";
import { summarizeRun } from "@/lib/optimization/run";
import { demoDataEnabled } from "@/lib/runtime-mode";
import { ensureOptimizationSchema, optimizationSql, wrapOptimizationError } from "@/lib/optimization/server/db";

export interface OptimizationRepository {
  saveRun(record: RunRecord): Promise<void>;
  listRuns(limit: number): Promise<RunSummary[]>;
  getRun(runId: string): Promise<RunRecord | null>;
  getStatuses(runId: string): Promise<Record<string, ActionStatus>>;
  setStatus(runId: string, recommendationId: string, status: ActionStatus): Promise<void>;
  /** A Sonil report saved against one run. Earlier imports of the same run are kept, and the latest one is shown. */
  saveSonilImport(record: SonilImportRecord): Promise<void>;
  latestSonilImport(runId: string): Promise<SonilImportRecord | null>;
}

class PostgresOptimizationRepository implements OptimizationRepository {
  async saveRun(record: RunRecord): Promise<void> {
    await ensureOptimizationSchema();
    const sql = optimizationSql();
    const summary = JSON.stringify(summarizeRun(record));
    const body = JSON.stringify(record);
    try {
      await sql`
        INSERT INTO optimization_runs (run_id, created_at, summary, record)
        VALUES (${record.runId}, ${record.createdAt}::timestamptz, ${summary}::jsonb, ${body}::jsonb)
      `;
    } catch (error) {
      throw wrapOptimizationError(error, "שגיאה בשמירת דוח האופטימיזציה במסד הנתונים.");
    }
  }

  async listRuns(limit: number): Promise<RunSummary[]> {
    await ensureOptimizationSchema();
    const sql = optimizationSql();
    try {
      const rows = (await sql`
        SELECT summary FROM optimization_runs ORDER BY created_at DESC LIMIT ${limit}
      `) as Array<{ summary: RunSummary }>;
      return rows.map((row) => row.summary);
    } catch (error) {
      throw wrapOptimizationError(error, "שגיאה בטעינת רשימת הדוחות ממסד הנתונים.");
    }
  }

  async getRun(runId: string): Promise<RunRecord | null> {
    await ensureOptimizationSchema();
    const sql = optimizationSql();
    try {
      const rows = (await sql`SELECT record FROM optimization_runs WHERE run_id = ${runId} LIMIT 1`) as Array<{
        record: RunRecord;
      }>;
      return rows[0]?.record ?? null;
    } catch (error) {
      throw wrapOptimizationError(error, "שגיאה בטעינת הדוח ממסד הנתונים.");
    }
  }

  async getStatuses(runId: string): Promise<Record<string, ActionStatus>> {
    await ensureOptimizationSchema();
    const sql = optimizationSql();
    try {
      const rows = (await sql`
        SELECT recommendation_id, status FROM optimization_recommendation_status WHERE run_id = ${runId}
      `) as Array<{ recommendation_id: string; status: ActionStatus }>;
      return Object.fromEntries(rows.map((row) => [row.recommendation_id, row.status]));
    } catch (error) {
      throw wrapOptimizationError(error, "שגיאה בטעינת סטטוסי הפעולות ממסד הנתונים.");
    }
  }

  async setStatus(runId: string, recommendationId: string, status: ActionStatus): Promise<void> {
    await ensureOptimizationSchema();
    const sql = optimizationSql();
    try {
      await sql`
        INSERT INTO optimization_recommendation_status (run_id, recommendation_id, status, updated_at)
        VALUES (${runId}, ${recommendationId}, ${status}, now())
        ON CONFLICT (run_id, recommendation_id)
        DO UPDATE SET status = EXCLUDED.status, updated_at = now()
      `;
    } catch (error) {
      throw wrapOptimizationError(error, "שגיאה בשמירת סטטוס הפעולה במסד הנתונים.");
    }
  }

  async saveSonilImport(record: SonilImportRecord): Promise<void> {
    await ensureOptimizationSchema();
    const sql = optimizationSql();
    const summary = JSON.stringify(record.summary);
    const body = JSON.stringify(record);
    try {
      await sql`
        INSERT INTO optimization_sonil_imports (import_id, run_id, created_at, summary, record)
        VALUES (${record.summary.importId}, ${record.summary.runId}, ${record.summary.createdAt}::timestamptz, ${summary}::jsonb, ${body}::jsonb)
      `;
    } catch (error) {
      throw wrapOptimizationError(error, "שגיאה בשמירת דוח סוניל במסד הנתונים.");
    }
  }

  async latestSonilImport(runId: string): Promise<SonilImportRecord | null> {
    await ensureOptimizationSchema();
    const sql = optimizationSql();
    try {
      const rows = (await sql`
        SELECT record FROM optimization_sonil_imports WHERE run_id = ${runId} ORDER BY created_at DESC LIMIT 1
      `) as Array<{ record: SonilImportRecord }>;
      return rows[0]?.record ?? null;
    } catch (error) {
      throw wrapOptimizationError(error, "שגיאה בטעינת דוח סוניל ממסד הנתונים.");
    }
  }
}

/**
 * In-process storage for demo mode only (ECOM_DEMO_DATA=1). Demo runs never reach the real database, and they are gone
 * when the server restarts. The UI shows this explicitly.
 */
class MemoryOptimizationRepository implements OptimizationRepository {
  private readonly runs = new Map<string, RunRecord>();
  private readonly statuses = new Map<string, Map<string, ActionStatus>>();
  private readonly sonilImports = new Map<string, SonilImportRecord[]>();

  async saveRun(record: RunRecord): Promise<void> {
    this.runs.set(record.runId, record);
  }

  async listRuns(limit: number): Promise<RunSummary[]> {
    return [...this.runs.values()]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
      .slice(0, limit)
      .map(summarizeRun);
  }

  async getRun(runId: string): Promise<RunRecord | null> {
    return this.runs.get(runId) ?? null;
  }

  async getStatuses(runId: string): Promise<Record<string, ActionStatus>> {
    return Object.fromEntries(this.statuses.get(runId) ?? []);
  }

  async setStatus(runId: string, recommendationId: string, status: ActionStatus): Promise<void> {
    const perRun = this.statuses.get(runId) ?? new Map<string, ActionStatus>();
    perRun.set(recommendationId, status);
    this.statuses.set(runId, perRun);
  }

  async saveSonilImport(record: SonilImportRecord): Promise<void> {
    const list = this.sonilImports.get(record.summary.runId) ?? [];
    list.push(record);
    this.sonilImports.set(record.summary.runId, list);
  }

  async latestSonilImport(runId: string): Promise<SonilImportRecord | null> {
    const list = this.sonilImports.get(runId) ?? [];
    return list[list.length - 1] ?? null;
  }
}

let memoryRepository: MemoryOptimizationRepository | null = null;
let postgresRepository: PostgresOptimizationRepository | null = null;

/** Demo mode gets the in-memory store. Every other mode gets Neon, and fails with a clear message when it is not configured. */
export function getOptimizationRepository(): OptimizationRepository {
  if (demoDataEnabled()) {
    if (!memoryRepository) memoryRepository = new MemoryOptimizationRepository();
    return memoryRepository;
  }
  if (!postgresRepository) postgresRepository = new PostgresOptimizationRepository();
  return postgresRepository;
}
