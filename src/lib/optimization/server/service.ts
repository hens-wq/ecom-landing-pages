import "server-only";

import { randomUUID } from "node:crypto";

import type { DateRange } from "@/lib/advertising/types";
import { evaluateOptimization } from "@/lib/optimization/engine";
import type { RunRecord } from "@/lib/optimization/run";
import { OPTIMIZATION_RULE_VERSION } from "@/lib/optimization/thresholds";
import { collectOptimizationRun } from "@/lib/optimization/server/collect";
import { assertDatabaseConfigured } from "@/lib/optimization/server/db";
import { getOptimizationRepository } from "@/lib/optimization/server/repository";
import { demoDataEnabled } from "@/lib/runtime-mode";

/**
 * One analysis run, on request only: read the data, decide, save. Nothing calls this on a page load, a tab switch or a
 * refresh. The database is checked first, so a run never reads Meta when its result could not be saved.
 */
export async function createOptimizationRun(selected: DateRange, now: Date): Promise<RunRecord> {
  if (!demoDataEnabled()) assertDatabaseConfigured();

  const collected = await collectOptimizationRun(selected, now);
  const output = evaluateOptimization(collected.engineInput);
  const record: RunRecord = {
    runId: randomUUID(),
    createdAt: now.toISOString(),
    dataFetchedAt: collected.dataFetchedAt,
    dataSource: collected.dataSource,
    selected: { since: selected.since, until: selected.until },
    selectedDays: collected.plan.selectedDays,
    selectedPartial: collected.plan.selectedPartial,
    comparison: collected.comparison,
    ruleVersion: OPTIMIZATION_RULE_VERSION,
    scope: collected.scope,
    sources: collected.sources,
    metricsSnapshot: { entities: collected.engineInput.entities },
    output,
  };
  await getOptimizationRepository().saveRun(record);
  return record;
}
