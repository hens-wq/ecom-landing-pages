import { ACTION_LABELS, toneForAction, type ActionCode, type Tone } from "@/lib/optimization/labels";
import { entityKey, type Confidence, type EntityEvaluation, type EntityInput, type Level, type Recommendation } from "@/lib/optimization/model";
import type { RunRecord } from "@/lib/optimization/run";
import type { NormalizedSonilRow } from "@/lib/optimization/sonil/normalize";

/**
 * The comparison tab: our independent recommendation next to Sonil's, for the same entity. It only reads. Our side is taken
 * from the saved run, unchanged, and nothing Sonil wrote can change it.
 */

export type SonilOutcome = "agreement" | "disagreement" | "data_gap";

export const OUTCOME_LABELS: Record<SonilOutcome, string> = {
  agreement: "הסכמה",
  disagreement: "מחלוקת",
  data_gap: "פער בנתונים",
};

/** Keep and scale point one way; warn and pause point the other; the rest are neutral. Agreement means the same direction. */
const DIRECTION: Record<ActionCode, -1 | 0 | 1> = {
  KEEP: 1,
  SCALE_CANDIDATE: 1,
  WATCH: 0,
  TEST: 0,
  FIX: 0,
  WARNING: -1,
  PAUSE_CANDIDATE: -1,
  PAUSE: -1,
};

const EVALUATION_TEXT = {
  not_active: "היחידה לא פעילה, ולכן ההכרעה שלנו חלקית בלבד.",
  insufficient_delivery: "האספקה בטווח לא הספיקה להכרעה שלנו.",
  insufficient_data: "הנתונים שלנו לא הספיקו להכרעה.",
} as const;

/** Our recommendation as the comparison shows it. A copy of the saved run's figures, never edited. */
export interface OwnRecommendation {
  recommendationId: string;
  ruleCode: string;
  action: ActionCode;
  actionLabel: string;
  tone: Tone;
  priority: number;
  reason: string;
  facts: string[];
  ruleText: string;
  confidence: Confidence;
  missingData: string[];
  nextCheck: string;
  entityName: string;
  campaignName: string;
}

export interface SonilComparisonRow {
  key: string;
  level: Level;
  entityId: string;
  entityName: string | null;
  campaignName: string | null;
  ours: OwnRecommendation | null;
  /** Sonil's side: the actions its words map to, its own words, and the file rows they came from. Null when Sonil said nothing. */
  sonil: { actions: ActionCode[]; texts: string[]; rowNumbers: number[] } | null;
  outcome: SonilOutcome;
  outcomeText: string;
  suggestedCheck: string;
}

interface Decision {
  outcome: SonilOutcome;
  outcomeText: string;
  suggestedCheck: string;
}

function toOwn(recommendation: Recommendation): OwnRecommendation {
  return {
    recommendationId: recommendation.id,
    ruleCode: recommendation.ruleCode,
    action: recommendation.action,
    actionLabel: ACTION_LABELS[recommendation.action],
    tone: toneForAction(recommendation.action),
    priority: recommendation.priority,
    reason: recommendation.reason,
    facts: recommendation.facts,
    ruleText: recommendation.ruleText,
    confidence: recommendation.confidence,
    missingData: recommendation.missingData,
    nextCheck: recommendation.nextCheck,
    entityName: recommendation.entityName,
    campaignName: recommendation.campaignName,
  };
}

function gap(outcomeText: string, suggestedCheck: string): Decision {
  return { outcome: "data_gap", outcomeText, suggestedCheck };
}

/**
 * The outcome of one entity. The checks run in order, and the first one that applies decides the row. Only when both sides
 * have a usable recommendation is the direction compared.
 */
function decide(input: {
  entity: EntityInput | null;
  recommendation: Recommendation | null;
  evaluation: EntityEvaluation | null;
  sonilRows: NormalizedSonilRow[];
  actions: ActionCode[];
  texts: string[];
}): Decision {
  const { entity, recommendation, evaluation, sonilRows, actions, texts } = input;

  if (sonilRows.length === 0 || texts.length === 0) {
    return gap("סוניל לא נתן המלצה ליחידה הזו בקובץ.", "להעלות שוב את דוח סוניל ולוודא שהשורה של היחידה נכללה בו.");
  }
  if (sonilRows.some((row) => row.recommendationText !== null && row.action === null)) {
    return gap("הטקסט של סוניל לא מופה לפעולה, ולכן אין השוואה.", "למפות את הטקסט בטבלת המיפוי ולשמור שוב.");
  }
  if (actions.length > 1) {
    return gap("סוניל נתן יותר מהמלצה אחת ליחידה הזו, ולכן אין הכרעה.", "לבדוק בדוח סוניל איזו המלצה נכונה, ולהשאיר שורה אחת.");
  }
  if (!entity) {
    return gap("היחידה לא נמצאה בניתוח שלנו.", "לבדוק שהמזהה שייך לחשבון ולטווח הנכונים.");
  }
  if (!recommendation) {
    return gap("המערכת שלנו לא הפיקה המלצה ליחידה הזו.", "לבדוק את הנתונים של היחידה בניתוח.");
  }
  if (evaluation && evaluation.evaluation !== "ok") {
    return gap(EVALUATION_TEXT[evaluation.evaluation as keyof typeof EVALUATION_TEXT], recommendation.nextCheck);
  }

  const ours = recommendation.action;
  const theirs = actions[0];
  if (DIRECTION[ours] === DIRECTION[theirs]) {
    return {
      outcome: "agreement",
      outcomeText: `שתי המערכות מציעות כיוון דומה: ${ACTION_LABELS[ours]} לעומת ${ACTION_LABELS[theirs]}.`,
      suggestedCheck: `לבדוק את הנתונים שמאחורי ההמלצה לפני פעולה: ${recommendation.nextCheck}`,
    };
  }
  return {
    outcome: "disagreement",
    outcomeText: `המערכת שלנו: ${ACTION_LABELS[ours]}. סוניל: ${ACTION_LABELS[theirs]}. הכיוון שונה.`,
    suggestedCheck: `לבדוק את ההבדל לפני החלטה: ${recommendation.nextCheck}`,
  };
}

const RANK: Record<SonilOutcome, number> = { disagreement: 0, data_gap: 1, agreement: 2 };

export function compareWithOwnRecommendations(run: RunRecord, rows: NormalizedSonilRow[]): SonilComparisonRow[] {
  const identity = new Map<string, { level: Level; entityId: string }>();
  const sonilByKey = new Map<string, NormalizedSonilRow[]>();
  for (const row of rows) {
    if (row.level === null || row.entityId === null) continue;
    const key = entityKey(row.level, row.entityId);
    identity.set(key, { level: row.level, entityId: row.entityId });
    sonilByKey.set(key, [...(sonilByKey.get(key) ?? []), row]);
  }

  // The first recommendation of an entity in the saved order is its main one. The run is already sorted by priority.
  const primaryByKey = new Map<string, Recommendation>();
  for (const recommendation of run.output.recommendations) {
    const key = entityKey(recommendation.level, recommendation.entityId);
    identity.set(key, { level: recommendation.level, entityId: recommendation.entityId });
    if (!primaryByKey.has(key)) primaryByKey.set(key, recommendation);
  }

  const evaluationByKey = new Map(run.output.entities.map((evaluation) => [evaluation.key, evaluation]));
  const entityByKey = new Map(run.metricsSnapshot.entities.map((entity) => [entityKey(entity.level, entity.id), entity]));

  const result: Array<{ row: SonilComparisonRow; spend: number; priority: number }> = [];
  for (const [key, { level, entityId }] of identity) {
    const recommendation = primaryByKey.get(key) ?? null;
    const sonilRows = sonilByKey.get(key) ?? [];
    const entity = entityByKey.get(key) ?? null;
    const evaluation = evaluationByKey.get(key) ?? null;

    const actions = [...new Set(sonilRows.map((row) => row.action).filter((action): action is ActionCode => action !== null))];
    const texts = [...new Set(sonilRows.map((row) => row.recommendationText).filter((text): text is string => text !== null))];
    const decision = decide({ entity, recommendation, evaluation, sonilRows, actions, texts });

    result.push({
      row: {
        key,
        level,
        entityId,
        entityName: entity?.name ?? recommendation?.entityName ?? null,
        campaignName: entity?.campaignName ?? recommendation?.campaignName ?? null,
        ours: recommendation ? toOwn(recommendation) : null,
        sonil: sonilRows.length > 0 ? { actions, texts, rowNumbers: sonilRows.map((row) => row.rowNumber) } : null,
        outcome: decision.outcome,
        outcomeText: decision.outcomeText,
        suggestedCheck: decision.suggestedCheck,
      },
      spend: entity?.selected.spend ?? 0,
      priority: recommendation?.priority ?? 9,
    });
  }

  // Disagreements first, then the gaps, then the agreements. Within each, the most important and the largest spend come first.
  result.sort(
    (a, b) =>
      RANK[a.row.outcome] - RANK[b.row.outcome] || a.priority - b.priority || b.spend - a.spend || a.row.key.localeCompare(b.row.key)
  );
  return result.map((item) => item.row);
}
