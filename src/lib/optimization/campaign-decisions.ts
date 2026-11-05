import type { Derived } from "@/lib/optimization/derive";
import { formatCount, formatIls } from "@/lib/optimization/format";
import { classifiedMeaningful, leadSampleMeaningful } from "@/lib/optimization/context";
import { gapAffects, leadDataStateOf } from "@/lib/optimization/lead-data-state";
import { LEVEL_LABELS, type Tone } from "@/lib/optimization/labels";
import type { Confidence, EngineOutput, EntityEvaluation, Level, Recommendation } from "@/lib/optimization/model";
import type { AttributionGaps } from "@/lib/performance/attribution";
import { cplTier } from "@/lib/performance/cpl-tier";
import {
  CLASSIFIED_INSUFFICIENT_BELOW,
  CPA_HIGH_FROM,
  CPA_POSITIVE_BELOW,
  LEADS_MEANINGFUL_FROM,
} from "@/lib/optimization/thresholds";

/**
 * The campaign decision layer: one central decision per campaign. It reads the rules engine's own output (its findings,
 * its figures and its thresholds) and adds no thresholds and no second scoring. The same snapshot always gives the same
 * decisions. The precedence is fixed, and the first rule that applies decides:
 *  1. Data integrity. A campaign whose lead data is damaged gets DATA CHECK with the exact gap. Only that campaign is held.
 *  2. No delivery (no spend and no impressions in the window): INSUFFICIENT DATA.
 *  3. A paused campaign is described as paused, never as "pause now". It may get a reactivation suggestion.
 *  4. Registrations and CPA come before CPL. A good cost per registration is never overridden by CPL alone.
 *  5. Without a good registration result: severe CPL, then lead quality, then a small sample, then CPL as a watch item.
 * Warnings below a decision never contradict it. A campaign's own SCALE and PAUSE never appear together, and a child's
 * own decision is shown as that child's, at its own level.
 */

export const DECISION_CODES = [
  "KEEP",
  "WATCH",
  "INVESTIGATE",
  "PAUSE_CANDIDATE",
  "SCALE_CANDIDATE",
  "DATA_CHECK",
  "INSUFFICIENT_DATA",
] as const;
export type DecisionCode = (typeof DECISION_CODES)[number];

export const DECISION_LABELS: Record<DecisionCode, { en: string; he: string; tone: Tone }> = {
  KEEP: { en: "KEEP", he: "להשאיר", tone: "positive" },
  WATCH: { en: "WATCH", he: "לעקוב", tone: "watch" },
  INVESTIGATE: { en: "INVESTIGATE", he: "לחקור", tone: "problem" },
  PAUSE_CANDIDATE: { en: "PAUSE CANDIDATE", he: "מועמד להשהיה", tone: "problem" },
  SCALE_CANDIDATE: { en: "SCALE CANDIDATE", he: "מועמד להגדלה", tone: "positive" },
  DATA_CHECK: { en: "DATA CHECK", he: "בדיקת נתונים", tone: "info" },
  INSUFFICIENT_DATA: { en: "INSUFFICIENT DATA", he: "אין מספיק נתונים", tone: "insufficient" },
};

/** Table order: a campaign whose data is damaged is checked before any verdict on it. */
const DECISION_ORDER: Record<DecisionCode, number> = {
  DATA_CHECK: 0,
  PAUSE_CANDIDATE: 1,
  INVESTIGATE: 2,
  SCALE_CANDIDATE: 3,
  WATCH: 4,
  INSUFFICIENT_DATA: 5,
  KEEP: 6,
};

export type DataGapKind = "source_mismatch" | "attribution_missing" | "data_unavailable" | "statuses_partial";

/** The exact gap behind a DATA CHECK. taskKey groups gaps into one central investigation task on the summary. */
export interface DataGap {
  kind: DataGapKind;
  taskKey: "lead-capture" | "lead-statuses";
  metaLeads: number;
  dashboardLeads: number;
  unassigned: number;
  noIds: number;
  idNotListed: number;
  unknownStatusLeads: number;
}

/** The unit under a campaign that carries the strongest lead signal. The campaign's decision is not changed by it. */
export interface CampaignFocus {
  level: "adset" | "ad";
  id: string;
  name: string;
  spend: number;
  ruleText: string;
}

export interface CampaignDecision {
  campaignId: string;
  campaignName: string;
  status: EntityEvaluation["status"];
  decision: DecisionCode;
  tone: Tone;
  why: string;
  nextAction: string;
  stillUnknown: string;
  recheck: string;
  confidence: Confidence;
  /** Warnings shown below the decision. They explain, they never contradict the decision. */
  warnings: string[];
  focus: CampaignFocus | null;
  dataGap: DataGap | null;
  figures: {
    spend: number;
    leads: number;
    metaLeads: number;
    sales: number;
    cpl: number | null;
    cpa: number | null;
    qualifiedCpl: number | null;
    classified: number;
    red: number;
    pending: number;
  };
}

/** One central investigation task: every campaign whose gap belongs to the same task. */
export interface DataCheckTask {
  taskKey: DataGap["taskKey"];
  campaigns: CampaignDecision[];
}

/** Lead-side rule prefixes. Exposure rules (delivery, frequency, creative) never pick the focus unit. */
const LEAD_RULE_PREFIXES = ["CPL_", "CPA_", "QLT_", "LEAD_"] as const;

interface Draft {
  decision: DecisionCode;
  why: string;
  nextAction: string;
  stillUnknown: string;
  recheck: string;
  confidence: Confidence;
  dataGap: DataGap | null;
  /** Rule codes already stated by the decision, so the warnings do not repeat them. */
  usedRules: string[];
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function ruleOf(recommendations: Recommendation[], ruleCode: string): Recommendation | undefined {
  return recommendations.find((item) => item.ruleCode === ruleCode);
}

/** Quality in counts, never as a bare percentage: below the insufficient bound a single lead is not read as 100% red. */
function classifiedText(f: Derived): string {
  const pendingNote = `ממתינים: ${formatCount(f.pending)} (ממתין אינו ליד רע).`;
  if (f.classified === 0) return `אין עדיין לידים מסווגים. ${pendingNote}`;
  if (f.classified < CLASSIFIED_INSUFFICIENT_BELOW) {
    return `מסווגים: ${formatCount(f.classified)} בלבד, מדגם קטן מדי לקביעת איכות. ${pendingNote}`;
  }
  return `איכות הלידים: ${formatCount(f.red)} מתוך ${formatCount(f.classified)} מסווגים אדומים. ${pendingNote}`;
}

/** The unit under the campaign with the strongest lead signal: an ad before an ad set, then the larger spend. */
function focusOf(childRecs: Recommendation[], childEvals: EntityEvaluation[]): CampaignFocus | null {
  const candidates = childRecs
    .filter(
      (item) =>
        (item.action === "PAUSE_CANDIDATE" || item.action === "WARNING") &&
        LEAD_RULE_PREFIXES.some((prefix) => item.ruleCode.startsWith(prefix))
    )
    .map((item) => {
      const evaluation = childEvals.find((entry) => entry.level === item.level && entry.id === item.entityId);
      return { item, spend: evaluation?.selected.spend ?? 0 };
    });

  const pick = (level: Level) =>
    candidates
      .filter((candidate) => candidate.item.level === level)
      .sort(
        (a, b) =>
          (a.item.action === b.item.action ? 0 : a.item.action === "PAUSE_CANDIDATE" ? -1 : 1) ||
          b.spend - a.spend ||
          compareText(a.item.entityId, b.item.entityId)
      )[0];

  const best = pick("ad") ?? pick("adset");
  if (!best) return null;
  const level: "adset" | "ad" = best.item.level === "ad" ? "ad" : "adset";
  return { level, id: best.item.entityId, name: best.item.entityName, spend: best.spend, ruleText: best.item.ruleText };
}

function focusSentence(focus: CampaignFocus, campaignSpend: number): string {
  return `${LEVEL_LABELS[focus.level]} "${focus.name}" (הוצאה ${formatIls(focus.spend)} מתוך ${formatIls(campaignSpend)} בקמפיין)`;
}

function dataCheckDraft(kind: DataGapKind, f: Derived, gaps: AttributionGaps | null): Draft {
  const dataGap: DataGap = {
    kind,
    taskKey: kind === "statuses_partial" ? "lead-statuses" : "lead-capture",
    metaLeads: f.metaLeads,
    dashboardLeads: f.leads,
    unassigned: gaps?.unassigned ?? 0,
    noIds: gaps?.noIds ?? 0,
    idNotListed: gaps?.idNotListed ?? 0,
    unknownStatusLeads: f.unknownStatusLeads,
  };
  const counts = `Meta מדווחת ${formatCount(f.metaLeads)} לידים, הדשבורד מציג ${formatCount(f.leads)} (פער ${formatCount(f.metaLeads - f.leads)})`;
  const hold = "לא להשהות ולא להגדיל. לבדוק את קליטת לידי דף הנחיתה ואת השיוך (campaign_id, adset_id, ad_id) לפני כל החלטה.";
  const recheckText = "אחרי שמספר הלידים בדשבורד ו-Meta מסכים, או אחרי הרצה חדשה על הטווח.";

  if (kind === "statuses_partial") {
    return {
      decision: "DATA_CHECK",
      why: `סטטוסי לידים לא נטענו עבור ${formatCount(f.unknownStatusLeads)} לידים. ההרשמות וה-CPA אינם ודאיים.`,
      nextAction: "לטעון מחדש את סטטוסי הלידים לטווח לפני כל החלטה על הקמפיין.",
      stillUnknown: "כמה מהלידים שלא נטענו הפכו להרשמה: לא ידוע.",
      recheck: "אחרי טעינה מלאה של הסטטוסים.",
      confidence: "medium",
      dataGap,
      usedRules: [],
    };
  }

  if (kind === "data_unavailable") {
    return {
      decision: "DATA_CHECK",
      why: "נתוני הלידים לא נטענו במלואם לטווח הזה.",
      nextAction: "לטעון מחדש את הטווח. אין החלטה על הקמפיין בלי נתוני לידים מלאים.",
      stillUnknown: "סיבת הכשל מופיעה בהערות המקור בראש הדוח.",
      recheck: "אחרי טעינה מלאה של הנתונים.",
      confidence: "high",
      dataGap,
      usedRules: [],
    };
  }

  if (kind === "attribution_missing") {
    return {
      decision: "DATA_CHECK",
      why: `${counts}. בטווח ${formatCount(dataGap.unassigned)} לידים בלי שיוך מלא (בלי מזהה: ${formatCount(dataGap.noIds)}, מזהה שלא ברשימה: ${formatCount(dataGap.idNotListed)}).`,
      nextAction: hold,
      stillUnknown: "לא ידוע אילו מהלידים הלא-משויכים שייכים לקמפיין הזה. זו השערה לבדיקה, לא עובדה.",
      recheck: recheckText,
      confidence: "medium",
      dataGap,
      usedRules: [],
    };
  }

  return {
    decision: "DATA_CHECK",
    why: `${counts}.`,
    nextAction: hold,
    stillUnknown: "מקור הפער טרם אומת — נדרשת בדיקת קליטת לידי דף הנחיתה.",
    recheck: recheckText,
    confidence: "high",
    dataGap,
    usedRules: [],
  };
}

function pausedDraft(f: Derived): Draft {
  const positive = f.sales >= 1 && f.cpa !== null && f.cpa < CPA_POSITIVE_BELOW;
  return {
    decision: "WATCH",
    why: positive
      ? `כבר מושהה. בטווח: ${formatCount(f.sales)} הרשמות, CPA ${formatIls(f.cpa)}, הוצאה ${formatIls(f.spend)}.`
      : `כבר מושהה. בטווח: הוצאה ${formatIls(f.spend)}, ${formatCount(f.leads)} לידים, ${formatCount(f.sales)} הרשמות.`,
    nextAction: positive
      ? "כבר מושהה, לא לעצור שוב. מומלץ לשקול הפעלה מחדש, רק אחרי בדיקה שהטופס, הקישור והלידים תקינים."
      : "כבר מושהה. להשאיר מושהה; אין פעולה שנדרשת כעת.",
    stillUnknown: "הנתונים מתייחסים לטווח שנבחר בלבד. לא נבדק מה השתנה מאז ההשהיה.",
    recheck: positive ? "לפני הפעלה מחדש: בדיקת הטופס והלידים בטווח אחרון." : "אם הקמפיין יופעל מחדש.",
    confidence: positive ? "medium" : "low",
    dataGap: null,
    usedRules: [],
  };
}

function noDeliveryDraft(): Draft {
  return {
    decision: "INSUFFICIENT_DATA",
    why: "בטווח הזה אין הוצאה ואין חשיפה.",
    nextAction: "לא לשנות דבר על בסיס הטווח הזה. לבחור טווח עם פעילות כדי להעריך את הקמפיין.",
    stillUnknown: "אין נתונים להעריך.",
    recheck: "כשיהיו הוצאה וחשיפה בטווח.",
    confidence: "low",
    dataGap: null,
    usedRules: [],
  };
}

function decideOne(
  campaign: EntityEvaluation,
  own: Recommendation[],
  focus: CampaignFocus | null,
  gaps: AttributionGaps | null
): Draft {
  const f = campaign.selected;
  const state = leadDataStateOf(f, gaps);
  const focusText = focus ? focusSentence(focus, f.spend) : null;

  // 1. Data integrity. The engine's own tracking finding decides first; the state covers gaps the engine has no rule for.
  const tracking = own.find((item) => item.action === "CHECK_DATA");
  if (tracking) {
    return dataCheckDraft(tracking.ruleCode === "TRK_ATTRIBUTION_MISSING" ? "attribution_missing" : "source_mismatch", f, gaps);
  }
  if (state === "source_mismatch" && f.leads < f.metaLeads) return dataCheckDraft("source_mismatch", f, gaps);
  if (state === "data_unavailable") return dataCheckDraft("data_unavailable", f, gaps);
  if (f.unknownStatusLeads > 0) return dataCheckDraft("statuses_partial", f, gaps);

  // 2. No delivery: there is nothing to judge.
  if (f.spend === 0 && f.impressions === 0) return noDeliveryDraft();

  // 3. Paused: described, never paused again.
  if (campaign.status !== "active") return pausedDraft(f);

  // 4. Registrations and CPA first.
  if (f.sales >= 1 && f.cpa !== null) {
    const basis = `${formatCount(f.sales)} הרשמות · CPA ${formatIls(f.cpa)} · הוצאה ${formatIls(f.spend)}`;
    const meaningful = leadSampleMeaningful(f);

    if (f.cpa < CPA_POSITIVE_BELOW) {
      const scale = ruleOf(own, "CPA_SCALE_CANDIDATE");
      if (scale) {
        return {
          decision: "SCALE_CANDIDATE",
          why: `${basis}. CPA מתחת ל-${formatIls(CPA_POSITIVE_BELOW)}, והיציבות נבדקה.`,
          nextAction: "לבדוק יציבות לאורך השבוע, ואז להחליט על הגדלה ידנית. אין שינוי תקציב אוטומטי.",
          stillUnknown: classifiedText(f),
          recheck: "אחרי שבוע נוסף עם CPA יציב.",
          confidence: scale.confidence,
          dataGap: null,
          usedRules: ["CPA_SCALE_CANDIDATE"],
        };
      }

      const quality = ruleOf(own, "QLT_RED_RATE");
      const checkScale = ruleOf(own, "CPA_CHECK_SCALE") ?? ruleOf(own, "CPA_CHECK_SCALE_OUT_OF_WINDOW");
      let nextAction = f.sales < 3 ? "להשאיר ולעקוב. הגדלה תיבחן רק אחרי 3 הרשמות ב-7 ימים." : "להשאיר ולעקוב.";
      if (quality?.action === "WARNING") {
        nextAction = `להשאיר. לפני כל הגדלה: לבדוק את איכות הלידים (${formatCount(f.red)} מתוך ${formatCount(f.classified)} מסווגים אדומים).`;
      } else if (checkScale?.ruleCode === "CPA_CHECK_SCALE_OUT_OF_WINDOW") {
        nextAction = "להשאיר. להריץ ניתוח על 7 ימים לפני החלטה על הגדלה.";
      } else if (checkScale) {
        nextAction = "להשאיר. ההגדלה לא הוכרעה: לבדוק יציבות לאורך 7 ימים.";
      }
      return {
        decision: "KEEP",
        why: `${basis}. CPA מתחת ל-${formatIls(CPA_POSITIVE_BELOW)}.`,
        nextAction,
        stillUnknown: classifiedText(f),
        recheck: "אחרי שבוע נוסף בטווח של 7 ימים. הגדלה תיבחן רק אחרי 3 הרשמות.",
        confidence: meaningful && f.sales >= 2 ? "medium" : "low",
        dataGap: null,
        usedRules: [],
      };
    }

    if (f.cpa <= CPA_HIGH_FROM) {
      return {
        decision: "KEEP",
        why: `${basis}. CPA בין ${formatIls(CPA_POSITIVE_BELOW)} ל-${formatIls(CPA_HIGH_FROM)}: טווח ביניים.`,
        nextAction: "להשאיר ולעקוב אחרי המגמה בשבוע הבא.",
        stillUnknown: classifiedText(f),
        recheck: "אחרי שבוע נוסף בטווח.",
        confidence: meaningful ? "medium" : "low",
        dataGap: null,
        usedRules: [],
      };
    }

    const highPause = ruleOf(own, "CPA_HIGH_PAUSE_CANDIDATE");
    if (highPause) {
      return {
        decision: "PAUSE_CANDIDATE",
        why: `${basis}. CPA מעל ${formatIls(CPA_HIGH_FROM)} על מדגם מספיק, בלי שיפור.`,
        nextAction: "מועמד להשהיה לבדיקה ידנית, לא פעולה אוטומטית. לפני השהיה: לבדוק את איכות הלידים ואת מסלול המכירה.",
        stillUnknown: classifiedText(f),
        recheck: "אחרי בדיקת איכות הלידים ומסלול המכירה. השהיה ידנית בלבד.",
        confidence: highPause.confidence,
        dataGap: null,
        usedRules: ["CPA_HIGH_PAUSE_CANDIDATE"],
      };
    }
    return {
      decision: "WATCH",
      why: `${basis}. CPA מעל ${formatIls(CPA_HIGH_FROM)}, אבל המדגם קטן או שיש שיפור.`,
      nextAction: "לעקוב אחרי עוד שבוע, ולהשוות שוב.",
      stillUnknown: classifiedText(f),
      recheck: "אחרי שבוע נוסף בטווח.",
      confidence: "low",
      dataGap: null,
      usedRules: ["CPA_HIGH_WATCH"],
    };
  }

  // 5. No good registration result. Severe CPL, then quality, then sample size, then CPL as a watch item.
  const zeroPause = ruleOf(own, "LEAD_ZERO_CONFIRMED") ?? ruleOf(own, "CPL_SEVERE_NO_SALES");
  if (zeroPause) {
    return {
      decision: "PAUSE_CANDIDATE",
      why:
        f.leads === 0
          ? `הוצאה ${formatIls(f.spend)} על 0 לידים בשני המקורות (Meta והדשבורד).`
          : `CPL ${formatIls(f.cpl)} על ${formatCount(f.leads)} לידים, בלי הרשמה, הוצאה ${formatIls(f.spend)}.`,
      nextAction: "מועמד להשהיה לבדיקה ידנית, לא פעולה אוטומטית. לפני השהיה: לבדוק את הטופס, ה-Pixel או הקישור ואת יעד המודעה.",
      stillUnknown: f.leads === 0 ? "אין לידים לבדיקת איכות." : classifiedText(f),
      recheck: "אחרי בדיקת הטופס והקישור. לא להשהות על CPL לבדו כשיש הרשמות בעלות טובה.",
      confidence: zeroPause.confidence,
      dataGap: null,
      usedRules: [zeroPause.ruleCode],
    };
  }

  const severeSmall = ruleOf(own, "CPL_SEVERE_SMALL_SAMPLE");
  if (severeSmall) {
    return {
      decision: "INVESTIGATE",
      why: `CPL ${formatIls(f.cpl)} על ${formatCount(f.leads)} לידים בלבד, בלי הרשמה. הוצאה ${formatIls(f.spend)}.`,
      nextAction: focusText
        ? `בדיקה דחופה. מוקד הבדיקה: ${focusText}. לא להשהות: המדגם קטן.`
        : "בדיקה דחופה ברמת המודעה או סט המודעות עם ההוצאה הגבוהה ביותר. לא להשהות: המדגם קטן.",
      stillUnknown: `${classifiedText(f)} מדגם כזה לא מספיק לקביעת איכות.`,
      recheck: `אחרי ${formatCount(LEADS_MEANINGFUL_FROM)} לידים בטווח, או אחרי שהסטטוסים מסווגים.`,
      confidence: "low",
      dataGap: null,
      usedRules: ["CPL_SEVERE_SMALL_SAMPLE"],
    };
  }

  const quality = ruleOf(own, "QLT_RED_RATE");
  if (quality?.action === "WARNING") {
    return {
      decision: "INVESTIGATE",
      why: `${formatCount(f.red)} מתוך ${formatCount(f.classified)} מסווגים אדומים (${Math.round(f.redRate ?? 0)}%). CPL ${formatIls(f.cpl)}, CPL מסונן (ירוקים בלבד) ${formatIls(f.qualifiedCpl)}.`,
      nextAction: focusText
        ? `לחקור את הלידים האדומים. מוקד הבדיקה: ${focusText}. לא להגדיל על בסיס CPL נמוך.`
        : "לאתר היכן מתרכזים הלידים האדומים (לפי מודעה, סט מודעות ושאלות הטופס). לא להגדיל על בסיס CPL נמוך.",
      stillUnknown: `סיבת האדום טרם נבדקה. ממתינים: ${formatCount(f.pending)} (ממתין אינו ליד רע).`,
      recheck: "אחרי בדיקת האיכות ברמת סט המודעות והמודעות.",
      confidence: classifiedMeaningful(f) ? "high" : "low",
      dataGap: null,
      usedRules: ["QLT_RED_RATE"],
    };
  }

  const cplWarning = ruleOf(own, "CPL_WARNING");
  if (cplWarning && leadSampleMeaningful(f)) {
    return {
      decision: "INVESTIGATE",
      why: `CPL ${formatIls(f.cpl)} (בין 100 ל-150 ₪) על ${formatCount(f.leads)} לידים, בלי הרשמה.`,
      nextAction: quality
        ? `בדיקת איכות הלידים בעדיפות גבוהה: ${formatCount(f.red)} מתוך ${formatCount(f.classified)} מסווגים אדומים${classifiedMeaningful(f) ? "" : " (מדגם מסווג קטן)"}. לפני שינוי: לבדוק את הטופס ואת דף הנחיתה.`
        : "לפני שינוי: לבדוק את הטופס, את דף הנחיתה ואת איכות הלידים.",
      stillUnknown: classifiedText(f),
      recheck: "אחרי שבוע נוסף בטווח, או אחרי בדיקת הטופס.",
      confidence: classifiedMeaningful(f) ? "medium" : "low",
      dataGap: null,
      usedRules: ["CPL_WARNING"],
    };
  }

  if (!leadSampleMeaningful(f)) {
    return {
      decision: "INSUFFICIENT_DATA",
      why: `${formatCount(f.leads)} לידים בטווח, ${formatCount(f.sales)} הרשמות, הוצאה ${formatIls(f.spend)}. המדגם קטן מ-${formatCount(LEADS_MEANINGFUL_FROM)} לידים.`,
      nextAction: "לא להחליט על הקמפיין עדיין. לחכות למדגם גדול יותר.",
      stillUnknown: `CPL ${formatIls(f.cpl)}: אין מספיק לידים כדי להכריע על עלות או על איכות.`,
      recheck: `אחרי ${formatCount(LEADS_MEANINGFUL_FROM)} לידים בטווח.`,
      confidence: "low",
      dataGap: null,
      usedRules: [],
    };
  }

  if (cplTier(f.cpl) === "on_target") {
    return {
      decision: "WATCH",
      why: `CPL ${formatIls(f.cpl)} על ${formatCount(f.leads)} לידים, הוצאה ${formatIls(f.spend)}, 0 הרשמות.`,
      nextAction: "עלות ליד טובה, אבל ההרשמה טרם הוכחה. לעקוב, ולהחליט על בסיס הרשמות ולא על CPL לבדו.",
      stillUnknown: classifiedText(f),
      recheck: "אחרי שבוע נוסף בטווח.",
      confidence: "medium",
      dataGap: null,
      usedRules: [],
    };
  }

  return {
    decision: "WATCH",
    why: `${formatCount(f.leads)} לידים, 0 הרשמות, הוצאה ${formatIls(f.spend)}${f.cpl !== null ? `, CPL ${formatIls(f.cpl)}` : ""}.`,
    nextAction: "לעקוב אחרי הנתונים הבאים. אין התראה כאן, וזה לא הוכחת הצלחה.",
    stillUnknown: classifiedText(f),
    recheck: "אחרי שבוע נוסף בטווח.",
    confidence: "medium",
    dataGap: null,
    usedRules: [],
  };
}

/**
 * The warnings below a decision. Campaign-level findings that the decision does not already state are shown as they are.
 * A child's own SCALE or PAUSE is shown at the child's level, so it never reads as a campaign verdict.
 */
function warningsOf(own: Recommendation[], childRecs: Recommendation[], usedRules: string[], f: Derived, gaps: AttributionGaps | null): string[] {
  const warnings: string[] = [];

  if (f.leads === 0 && f.metaLeads === 0 && gapAffects(f, gaps)) {
    warnings.push(
      `לא ניתן לאשר אפס ליחידה הזו: בטווח ${formatCount(gaps?.noIds ?? 0)} לידים בלי מזהה כלל, ייתכן ששייכים אליה.`
    );
  }

  for (const item of own) {
    if (usedRules.includes(item.ruleCode)) continue;
    if (item.action === "CHECK_DATA" || item.action === "KEEP" || item.action === "SCALE_CANDIDATE") continue;
    if (item.action === "PAUSE_CANDIDATE" || item.action === "PAUSE") continue;
    warnings.push(`${item.ruleText}. ${item.facts.join(" · ")}`);
  }

  for (const item of childRecs) {
    if (item.action === "PAUSE_CANDIDATE" || item.action === "SCALE_CANDIDATE") {
      warnings.push(
        `${LEVEL_LABELS[item.level]} "${item.entityName}": ${item.actionLabel}. ההכרעה נשארת ברמה הזו; ההחלטה על הקמפיין לא משתנה בגללה.`
      );
    }
  }

  return warnings;
}

/**
 * One decision for every campaign of the run. Every campaign gets a decision or an explicit reason, because the decision
 * function always returns one. Pure: the same engine output and the same gaps always give the same decisions.
 */
export function decideCampaigns(output: EngineOutput, gaps: AttributionGaps | null): CampaignDecision[] {
  const decisions: CampaignDecision[] = [];

  for (const campaign of output.entities) {
    if (campaign.level !== "campaign") continue;

    const own = output.recommendations.filter((item) => item.level === "campaign" && item.entityId === campaign.id);
    const childRecs = output.recommendations.filter((item) => item.level !== "campaign" && item.campaignId === campaign.id);
    const childEvals = output.entities.filter((entry) => entry.level !== "campaign" && entry.campaignId === campaign.id);
    const focus = focusOf(childRecs, childEvals);
    const draft = decideOne(campaign, own, focus, gaps);
    const f = campaign.selected;

    decisions.push({
      campaignId: campaign.id,
      campaignName: campaign.name,
      status: campaign.status,
      decision: draft.decision,
      tone: DECISION_LABELS[draft.decision].tone,
      why: draft.why,
      nextAction: draft.nextAction,
      stillUnknown: draft.stillUnknown,
      recheck: draft.recheck,
      confidence: draft.confidence,
      warnings: warningsOf(own, childRecs, draft.usedRules, f, gaps),
      focus,
      dataGap: draft.dataGap,
      figures: {
        spend: f.spend,
        leads: f.leads,
        metaLeads: f.metaLeads,
        sales: f.sales,
        cpl: f.cpl,
        cpa: f.cpa,
        qualifiedCpl: f.qualifiedCpl,
        classified: f.classified,
        red: f.red,
        pending: f.pending,
      },
    });
  }

  return decisions.sort(
    (a, b) =>
      DECISION_ORDER[a.decision] - DECISION_ORDER[b.decision] ||
      b.figures.spend - a.figures.spend ||
      compareText(a.campaignId, b.campaignId)
  );
}

/**
 * The central investigation tasks behind the DATA CHECK rows. Each gap appears once as a task, listing the campaigns it
 * affects, so the summary does not repeat the same alert for every level.
 */
export function groupDataChecks(decisions: CampaignDecision[]): DataCheckTask[] {
  const order: DataGap["taskKey"][] = ["lead-capture", "lead-statuses"];
  return order
    .map((taskKey) => ({
      taskKey,
      campaigns: decisions.filter((item) => item.dataGap?.taskKey === taskKey),
    }))
    .filter((task) => task.campaigns.length > 0);
}
