import type { DateRange } from "@/lib/advertising/types";
import { inclusiveDayCount } from "@/lib/optimization/periods";
import type { EngineInput, EngineOutput } from "@/lib/optimization/model";
import { MAX_RUN_RANGE_DAYS } from "@/lib/optimization/thresholds";

/** A saved analysis run: what was read, what was decided, and the rule version. Opening it never runs a new analysis. */

export type DataSource = "meta" | "demo";
export type SourceState = "ok" | "partial" | "unavailable";

export interface RunScope {
  /** Excluded campaigns, by Campaign ID. Their data stays in the system. */
  exclusions: Array<{ id: string; name: string }>;
  /** Spend of excluded campaigns in the window. Kept for the record; it never enters a course figure. */
  excludedSpend: number;
  /** Spend of course ads that the listing did not return, in the window. Null when there is none, or in demo. */
  unlistedSpend: number | null;
  note: string;
}

export interface RunSources {
  meta: "ok" | "unavailable";
  leads: SourceState;
  statuses: SourceState;
  /** One Hebrew sentence per source problem, shown with the run. */
  notes: string[];
}

export interface RunComparison {
  current: DateRange | null;
  previous: DateRange | null;
  note: string;
}

export interface RunRecord {
  runId: string;
  createdAt: string;
  /** When the Meta and lead data were read for this run. */
  dataFetchedAt: string;
  dataSource: DataSource;
  selected: DateRange;
  selectedDays: number;
  selectedPartial: boolean;
  comparison: RunComparison;
  ruleVersion: string;
  scope: RunScope;
  sources: RunSources;
  /** The figures the rules read, per entity and per window. Kept so a saved report can be read back exactly. */
  metricsSnapshot: { entities: EngineInput["entities"] };
  output: EngineOutput;
}

export interface RunSummary {
  runId: string;
  createdAt: string;
  selected: DateRange;
  selectedDays: number;
  comparison: RunComparison;
  ruleVersion: string;
  dataSource: DataSource;
  recommendationCount: number;
}

export function summarizeRun(record: RunRecord): RunSummary {
  return {
    runId: record.runId,
    createdAt: record.createdAt,
    selected: record.selected,
    selectedDays: record.selectedDays,
    comparison: record.comparison,
    ruleVersion: record.ruleVersion,
    dataSource: record.dataSource,
    recommendationCount: record.output.recommendations.length,
  };
}

/** A Hebrew message when the range cannot be analysed, or null when it can. The caller checks the date format first. */
export function runRangeError(range: DateRange): string | null {
  if (range.since > range.until) return "תאריך ההתחלה חייב להיות לפני תאריך הסיום.";
  if (inclusiveDayCount(range) > MAX_RUN_RANGE_DAYS) {
    return `הטווח ארוך מדי: אפשר לנתח עד ${MAX_RUN_RANGE_DAYS} ימים בכל הרצה.`;
  }
  return null;
}
