import type { ActionCode, Tone } from "@/lib/optimization/labels";
import type { Derived, WindowFigures } from "@/lib/optimization/derive";
import type { AttributionGaps } from "@/lib/performance/attribution";
import type { EntityStatus } from "@/lib/types";

export type Level = "campaign" | "adset" | "ad";

/** The stable key of one entity: its level and its Meta ID. Used for maps and for recommendation IDs. */
export function entityKey(level: Level, id: string): string {
  return `${level}:${id}`;
}
export type Confidence = "high" | "medium" | "low";
export type Priority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** One listed entity with its figures for the selected window and for the two trend windows. */
export interface EntityInput {
  level: Level;
  id: string;
  name: string;
  status: EntityStatus;
  campaignId: string;
  campaignName: string;
  /** Campaign: null. Ad set: its campaign's ID. Ad: its ad set's ID. */
  parentId: string | null;
  selected: WindowFigures;
  /** Complete days of the selection. Null when there is no trend window. */
  trendCurrent: WindowFigures | null;
  /** The same number of days before trendCurrent. Null when there is no trend window. */
  trendPrevious: WindowFigures | null;
}

/** One ad's spend on one complete day. Spend is additive, so a daily breakdown is safe (reach is not, and is never split by day). */
export interface DailyAdSpendRow {
  adId: string;
  campaignId: string;
  date: string;
  spend: number;
}

export interface EngineInput {
  rangeDays: number;
  selectedPartial: boolean;
  completeDates: string[];
  trendAvailable: boolean;
  /** Null when the daily breakdown could not be read. The budget checks then say so instead of guessing. */
  dailyAdSpend: DailyAdSpendRow[] | null;
  entities: EntityInput[];
  /** Notes about the data as a whole (for example, lead data that did not load), shown with the results. */
  sourceNotes: string[];
  /** Leads of the selected window that no unit carries. Null when the lead data did not load in full. */
  attributionGaps?: AttributionGaps | null;
}

/** What one rule concludes about one entity, before the engine resolves conflicts and levels. */
export interface Finding {
  ruleCode: string;
  priority: Priority;
  action: ActionCode;
  secondaryAction: string | null;
  flags: string[];
  ruleText: string;
  facts: string[];
  reason: string;
  confidence: Confidence;
  missingData: string[];
  nextCheck: string;
  notes: string[];
}

export interface Recommendation extends Finding {
  id: string;
  level: Level;
  entityId: string;
  entityName: string;
  campaignId: string;
  campaignName: string;
  entityStatus: EntityStatus;
  tone: Tone;
  actionLabel: string;
  priorityLabel: string;
}

export type EvaluationState = "ok" | "not_active" | "insufficient_delivery" | "insufficient_data";

export interface EntityEvaluation {
  key: string;
  level: Level;
  id: string;
  name: string;
  status: EntityStatus;
  campaignId: string;
  campaignName: string;
  parentId: string | null;
  selected: Derived;
  current: Derived | null;
  previous: Derived | null;
  /** Campaign health, read separately from the business result (the spec's two-state view). */
  exposureTone: Tone;
  exposureLabel: string;
  businessTone: Tone;
  businessLabel: string;
  evaluation: EvaluationState;
  evaluationNotes: string[];
  recommendationIds: string[];
}

export interface EngineOutput {
  recommendations: Recommendation[];
  entities: EntityEvaluation[];
  notes: string[];
}
