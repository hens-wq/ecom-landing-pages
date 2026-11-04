import { CPL_TARGET_MAX } from "@/lib/performance/cpl-tier";
import { buildRuleContext, leadSampleMeaningful } from "@/lib/optimization/context";
import { detectCampaignConcentration, type CampaignConcentration } from "@/lib/optimization/budget";
import { deriveFigures, type Derived } from "@/lib/optimization/derive";
import { ACTION_LABELS, PRIORITY_LABELS, toneForAction, type ActionCode, type Tone } from "@/lib/optimization/labels";
import {
  concentrationFindings,
  creativeFindings,
  cpmFindings,
  frequencyFindings,
  reachFindings,
  zeroImpressionsFindings,
} from "@/lib/optimization/rules-delivery";
import {
  cpaFindings,
  cplFindings,
  cplTrendFindings,
  qualityFindings,
  trackingFindings,
  zeroLeadsFindings,
} from "@/lib/optimization/rules-lead";
import {
  entityKey,
  type EngineInput,
  type EngineOutput,
  type EntityEvaluation,
  type EntityInput,
  type EvaluationState,
  type Finding,
  type Level,
  type Recommendation,
} from "@/lib/optimization/model";
import {
  CONCENTRATION_MIN_DAYS,
  CPA_HIGH_FROM,
  TREND_MIN_IMPRESSIONS,
  WEEKLY_ANALYSIS_DAYS,
} from "@/lib/optimization/thresholds";

/**
 * The decision layer. It runs every rule on every entity, then applies three resolutions that the spec requires:
 *  1. Lowest justified level: a campaign or ad set is paused only when no child carries the pause or a positive signal.
 *  2. One decision per entity: a scale candidate is dropped when the same entity has an active warning, and it becomes
 *     a check when stability cannot be shown.
 *  3. Paused or ended entities are described, not acted on: only tracking problems stay.
 * Pure: the same input and the same rule version always give the same output.
 */

const LEVEL_ORDER: Record<Level, number> = { campaign: 0, adset: 1, ad: 2 };
const SEVERITY: Record<ActionCode, number> = {
  PAUSE_CANDIDATE: 0,
  PAUSE: 0,
  WARNING: 1,
  FIX: 2,
  CHECK_DATA: 2.5,
  WATCH: 3,
  TEST: 4,
  KEEP: 5,
  SCALE_CANDIDATE: 6,
};
const PAUSE_ACTIONS: ReadonlySet<ActionCode> = new Set<ActionCode>(["PAUSE_CANDIDATE", "PAUSE"]);
/** Any of these on the same entity blocks a scale candidate. */
const SCALE_BLOCKERS: ReadonlySet<ActionCode> = new Set<ActionCode>(["WATCH", "WARNING", "PAUSE_CANDIDATE", "PAUSE", "FIX"]);
const EXPOSURE_PREFIXES = ["DLV_", "FRQ_", "VOL_", "CRV_"];
const LEAD_PREFIXES = ["TRK_", "LEAD_", "QLT_", "CPL_", "CPA_"];

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function compareEntities(a: EntityInput, b: EntityInput): number {
  return LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || b.selected.spend - a.selected.spend || compareText(a.id, b.id);
}

function parentKeyOf(entity: EntityInput): string | null {
  if (entity.parentId === null) return null;
  return entityKey(entity.level === "ad" ? "adset" : "campaign", entity.parentId);
}

function exposureHealth(sel: Derived, findings: Finding[]): { tone: Tone; label: string } {
  if (sel.impressions === 0 && sel.spend === 0) return { tone: "insufficient", label: "חשיפה: אין הוצאה או חשיפה בטווח" };
  const exposure = findings.filter((finding) => EXPOSURE_PREFIXES.some((prefix) => finding.ruleCode.startsWith(prefix)));
  const problem = exposure.some(
    (finding) =>
      finding.action === "FIX" ||
      finding.flags.includes("STRONG") ||
      finding.flags.includes("HIGH_PRIORITY") ||
      (finding.ruleCode === "VOL_REACH_DROP" && finding.action === "WARNING")
  );
  if (problem) return { tone: "problem", label: "חשיפה: בעיה" };
  if (exposure.length > 0) return { tone: "watch", label: "חשיפה: מעקב" };
  if (sel.impressions < TREND_MIN_IMPRESSIONS) return { tone: "insufficient", label: "חשיפה: מדגם קטן" };
  return { tone: "positive", label: "חשיפה: תקינה" };
}

function businessHealth(sel: Derived, findings: Finding[]): { tone: Tone; label: string } {
  if (!sel.leadsKnown) return { tone: "insufficient", label: "עסקי: אין נתוני לידים" };
  const lead = findings.filter((finding) => LEAD_PREFIXES.some((prefix) => finding.ruleCode.startsWith(prefix)));
  if (
    lead.some(
      (finding) =>
        finding.action === "WARNING" ||
        finding.action === "PAUSE_CANDIDATE" ||
        (finding.action === "FIX" && finding.ruleCode.startsWith("TRK_"))
    )
  ) {
    return { tone: "problem", label: "עסקי: בעיה" };
  }
  if (lead.some((finding) => finding.action === "WATCH")) return { tone: "watch", label: "עסקי: מעקב" };
  if (sel.unknownStatusLeads > 0) return { tone: "insufficient", label: "עסקי: סטטוסים חלקיים" };
  const cplOk = sel.cpl !== null && sel.cpl <= CPL_TARGET_MAX;
  const cpaOk = sel.sales >= 1 && sel.cpa !== null && sel.cpa < CPA_HIGH_FROM;
  if (cplOk || cpaOk) return { tone: "positive", label: "עסקי: תקין" };
  return { tone: "insufficient", label: "עסקי: אין מספיק לידים להכרעה" };
}

/** Every entity below a key, at any depth. */
function descendantsOf(key: string, childrenByKey: ReadonlyMap<string, EntityInput[]>): EntityInput[] {
  const found: EntityInput[] = [];
  const pending = [...(childrenByKey.get(key) ?? [])];
  for (let next = pending.shift(); next !== undefined; next = pending.shift()) {
    found.push(next);
    pending.push(...(childrenByKey.get(entityKey(next.level, next.id)) ?? []));
  }
  return found;
}

export function evaluateOptimization(input: EngineInput): EngineOutput {
  const entities = [...input.entities].sort(compareEntities);
  const byKey = new Map<string, EntityInput>();
  for (const entity of entities) byKey.set(entityKey(entity.level, entity.id), entity);

  const childrenByKey = new Map<string, EntityInput[]>();
  for (const entity of entities) {
    const parentKey = parentKeyOf(entity);
    if (parentKey === null) continue;
    const list = childrenByKey.get(parentKey) ?? [];
    list.push(entity);
    childrenByKey.set(parentKey, list);
  }

  const notes: string[] = [...input.sourceNotes];
  if (!input.trendAvailable) notes.push("אין תקופת השוואה: מגמות (CTR, CPC, CPM, Reach, CPL ו-CPA) לא מחושבות.");
  if (input.selectedPartial) {
    notes.push("היום הנוכחי חלקי: הערכים המוחלטים כוללים אותו, והמגמה מחושבת על ימים מלאים בלבד.");
  }
  if (input.rangeDays !== WEEKLY_ANALYSIS_DAYS) {
    notes.push("Frequency מוצגת ללא שיפוט: הסף השבועי חל רק על טווח של 7 ימים.");
  }

  // Budget concentration is judged per campaign that has at least two ads.
  const adsByCampaign = new Map<string, EntityInput[]>();
  for (const entity of entities) {
    if (entity.level !== "ad") continue;
    const list = adsByCampaign.get(entity.campaignId) ?? [];
    list.push(entity);
    adsByCampaign.set(entity.campaignId, list);
  }
  const concentrations = new Map<string, CampaignConcentration>();
  for (const [campaignId, ads] of adsByCampaign) {
    if (ads.length < 2) continue;
    const rows = input.dailyAdSpend === null ? null : input.dailyAdSpend.filter((row) => row.campaignId === campaignId);
    concentrations.set(
      campaignId,
      detectCampaignConcentration({
        campaignId,
        rows,
        completeDates: input.completeDates,
        windowSpendByAd: new Map(ads.map((ad) => [ad.id, ad.selected.spend] as const)),
        windowSpend: ads.reduce((total, ad) => total + ad.selected.spend, 0),
      })
    );
  }
  if (input.dailyAdSpend === null && concentrations.size > 0) {
    notes.push("ריכוז תקציב לא נבדק: נתוני ההוצאה היומיים לא נטענו.");
  } else if (concentrations.size > 0 && input.completeDates.length < CONCENTRATION_MIN_DAYS) {
    notes.push("ריכוז תקציב לא נבדק: פחות מ-3 ימים מלאים בטווח.");
  }

  const findingsByKey = new Map<string, Finding[]>();
  const evaluationNotesByKey = new Map<string, string[]>();
  const insufficientDelivery = new Set<string>();

  for (const entity of entities) {
    const key = entityKey(entity.level, entity.id);
    const parentKey = parentKeyOf(entity);
    const parent = parentKey === null ? undefined : byKey.get(parentKey);
    const ctx = buildRuleContext(entity, input, parent !== undefined && parent.selected.impressions === 0);
    const concentration = entity.level === "ad" ? concentrations.get(entity.campaignId) : undefined;
    if (concentration?.status === "concentrated" && concentration.insufficientAdIds.includes(entity.id)) {
      insufficientDelivery.add(key);
    }

    const all: Finding[] = [
      ...trackingFindings(ctx),
      ...zeroLeadsFindings(ctx),
      ...zeroImpressionsFindings(ctx),
      ...qualityFindings(ctx),
      ...cplFindings(ctx),
      ...cplTrendFindings(ctx),
      ...cpaFindings(ctx),
      ...reachFindings(ctx),
      ...frequencyFindings(ctx),
      ...creativeFindings(ctx),
      ...cpmFindings(ctx),
      ...concentrationFindings(ctx, concentration),
    ];

    const active = entity.status === "active";
    findingsByKey.set(key, active ? all : all.filter((finding) => finding.priority === 1));

    const evalNotes: string[] = [];
    if (!active) evalNotes.push("היחידה כבויה או לא פעילה בטווח: מוצגים בה רק בעיות מעקב, לא המלצות שינוי.");
    if (insufficientDelivery.has(key)) {
      evalNotes.push("לא ניתן להעריך הוגן: המודעה מקבלת פחות מ-10% מהתקציב של הקמפיין, בזמן שמודעה אחרת מקבלת ריכוז של 70% ומעלה.");
    }
    if (!entity.selected.leadsKnown) evalNotes.push("נתוני הלידים לא נטענו במלואם: מדדי הלידים מוצגים כלא ידועים.");
    evaluationNotesByKey.set(key, evalNotes);
  }

  // 1. Lowest justified level: a parent's pause stands only when nothing below it shows a pause or a positive signal.
  // Deepest levels first, so a decision below is final before the level above reads it.
  for (const entity of [...entities].sort((a, b) => LEVEL_ORDER[b.level] - LEVEL_ORDER[a.level])) {
    if (entity.level === "ad") continue;
    const key = entityKey(entity.level, entity.id);
    const own = findingsByKey.get(key) ?? [];
    if (!own.some((finding) => PAUSE_ACTIONS.has(finding.action))) continue;

    const descendants = descendantsOf(key, childrenByKey);
    const childPaused = descendants.some((child) =>
      (findingsByKey.get(entityKey(child.level, child.id)) ?? []).some((finding) => PAUSE_ACTIONS.has(finding.action))
    );
    const childPositive = descendants.some(
      (child) =>
        leadSampleMeaningful(deriveFigures(child.selected)) &&
        (findingsByKey.get(entityKey(child.level, child.id)) ?? []).some(
          (finding) => finding.action === "KEEP" || finding.action === "SCALE_CANDIDATE"
        )
    );
    if (!childPaused && !childPositive) continue;

    findingsByKey.set(
      key,
      own.filter((finding) => !PAUSE_ACTIONS.has(finding.action))
    );
    evaluationNotesByKey
      .get(key)
      ?.push("ההמלצה להשהיה נשארת ברמה נמוכה יותר: ביחידות הבנות יש אות מובהק. לא מומלץ לעצור את כל היחידה בגלל חלק ממנה.");
  }

  // 2. One decision per entity: a scale candidate yields to any active warning, and needs stability to stand.
  for (const entity of entities) {
    const key = entityKey(entity.level, entity.id);
    const own = findingsByKey.get(key) ?? [];
    const scale = own.find((finding) => finding.action === "SCALE_CANDIDATE");
    if (!scale) continue;

    const blocker = own.find((finding) => finding !== scale && SCALE_BLOCKERS.has(finding.action));
    if (blocker) {
      findingsByKey.set(
        key,
        own.filter((finding) => finding !== scale)
      );
      evaluationNotesByKey
        .get(key)
        ?.push(`הכרעה: לא הוצגה הגדלה, כי ביחידה יש אות פעיל (${blocker.ruleText}). ההכרעה לפי סדר העדיפויות.`);
      continue;
    }

    const cur = entity.trendCurrent ? deriveFigures(entity.trendCurrent) : null;
    const prev = entity.trendPrevious ? deriveFigures(entity.trendPrevious) : null;
    const worsening = cur !== null && prev !== null && cur.cpa !== null && prev.cpa !== null && cur.cpa > prev.cpa * 1.25;
    if (cur !== null && prev !== null && !worsening) continue;

    const why =
      cur === null || prev === null
        ? "היציבות לא נבדקה: אין תקופת השוואה."
        : "היציבות לא הוכחה: ה-CPA עלה ביותר מ-25% לעומת התקופה הקודמת.";
    findingsByKey.set(
      key,
      own.map((finding) =>
        finding === scale
          ? {
              ...finding,
              ruleCode: "CPA_CHECK_SCALE",
              priority: 3,
              action: "KEEP",
              secondaryAction: "CHECK SCALE",
              flags: ["CHECK_SCALE"],
              ruleText: "3 הרשמות ומעלה ב-7 ימים וגם CPA מתחת ל-2,000 ₪, אבל ההגדלה לא הוכרעה",
              confidence: "medium",
              reason: `ההגדלה דורשת יציבות. ${why}`,
              notes: [...finding.notes],
            }
          : finding
      )
    );
  }

  const spendByKey = new Map(entities.map((entity) => [entityKey(entity.level, entity.id), entity.selected.spend] as const));
  const recommendations: Recommendation[] = [];
  const seenIds = new Set<string>();
  for (const entity of entities) {
    const key = entityKey(entity.level, entity.id);
    for (const finding of findingsByKey.get(key) ?? []) {
      const id = `${finding.ruleCode}:${key}`;
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      recommendations.push({
        ...finding,
        id,
        level: entity.level,
        entityId: entity.id,
        entityName: entity.name,
        campaignId: entity.campaignId,
        campaignName: entity.campaignName,
        entityStatus: entity.status,
        tone: toneForAction(finding.action),
        actionLabel: ACTION_LABELS[finding.action],
        priorityLabel: PRIORITY_LABELS[finding.priority],
      });
    }
  }
  recommendations.sort((a, b) => {
    const spendA = spendByKey.get(entityKey(a.level, a.entityId)) ?? 0;
    const spendB = spendByKey.get(entityKey(b.level, b.entityId)) ?? 0;
    return a.priority - b.priority || SEVERITY[a.action] - SEVERITY[b.action] || spendB - spendA || compareText(a.id, b.id);
  });

  const idsByKey = new Map<string, string[]>();
  for (const recommendation of recommendations) {
    const key = entityKey(recommendation.level, recommendation.entityId);
    const list = idsByKey.get(key) ?? [];
    list.push(recommendation.id);
    idsByKey.set(key, list);
  }

  const evaluations: EntityEvaluation[] = entities.map((entity) => {
    const key = entityKey(entity.level, entity.id);
    const findings = findingsByKey.get(key) ?? [];
    const selected = deriveFigures(entity.selected);
    const exposure = exposureHealth(selected, findings);
    const business = businessHealth(selected, findings);
    let evaluation: EvaluationState = "ok";
    if (entity.status !== "active") evaluation = "not_active";
    else if (insufficientDelivery.has(key)) evaluation = "insufficient_delivery";
    else if (!selected.leadsKnown) evaluation = "insufficient_data";

    return {
      key,
      level: entity.level,
      id: entity.id,
      name: entity.name,
      status: entity.status,
      campaignId: entity.campaignId,
      campaignName: entity.campaignName,
      parentId: entity.parentId,
      selected,
      current: entity.trendCurrent ? deriveFigures(entity.trendCurrent) : null,
      previous: entity.trendPrevious ? deriveFigures(entity.trendPrevious) : null,
      exposureTone: exposure.tone,
      exposureLabel: exposure.label,
      businessTone: business.tone,
      businessLabel: business.label,
      evaluation,
      evaluationNotes: evaluationNotesByKey.get(key) ?? [],
      recommendationIds: idsByKey.get(key) ?? [],
    };
  });

  return { recommendations, entities: evaluations, notes };
}
