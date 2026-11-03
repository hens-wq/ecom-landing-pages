import { cplTier } from "@/lib/performance/cpl-tier";
import { classifiedMeaningful, leadSampleMeaningful, trendChanges, type RuleContext } from "@/lib/optimization/context";
import { makeFinding } from "@/lib/optimization/finding";
import { formatChange, formatCount, formatIls, formatPercent } from "@/lib/optimization/format";
import type { Finding } from "@/lib/optimization/model";
import {
  CLASSIFIED_INSUFFICIENT_BELOW,
  CPA_HIGH_FROM,
  CPA_POSITIVE_BELOW,
  CPL_RISE_FATIGUE,
  RED_RATE_OK_MAX,
  RED_RATE_WARNING_MAX,
  RED_RATE_WATCH_MAX,
  SCALE_MIN_REGISTRATIONS,
  STRONG_KEEP_REGISTRATIONS,
  WEEKLY_ANALYSIS_DAYS,
  ZERO_LEADS_MIN_SPEND,
} from "@/lib/optimization/thresholds";
import type { ActionCode } from "@/lib/optimization/labels";

/**
 * Tracking (priority 1). Meta and the dashboard must agree that a unit has leads before any verdict is made on it.
 * When they disagree, the unit is not judged: the disagreement itself is the finding.
 */
export function trackingFindings(ctx: RuleContext): Finding[] {
  const s = ctx.sel;
  if (!s.leadsKnown) return [];

  if (s.metaLeads === 0 && s.metaFormLeads > 0) {
    return [
      makeFinding({
        ruleCode: "TRK_META_ZERO_DASH_POS",
        priority: 1,
        action: "FIX",
        ruleText: "TRACKING / ATTRIBUTION ISSUE: הדשבורד מציג לידי Meta, אבל Meta מדווח 0 לידים לאותה יחידה",
        facts: [`לידי Meta בדשבורד: ${formatCount(s.metaFormLeads)}`, "לידים שמדווחים ב-Meta: 0"],
        reason: "כשהמקורות לא מסכימים אי אפשר להעריך את היחידה. לא מענישים אותה כאילו באמת אין לה לידים, וגם לא מסיקים שהיא מצליחה.",
        confidence: "medium",
        nextCheck: "לבדוק את שיוך הלידים (Ad ID) ואת חיבור טופס הלידים ב-Meta לפני כל החלטה על היחידה.",
      }),
    ];
  }

  if (s.metaLeads > 0 && s.metaFormLeads === 0) {
    return [
      makeFinding({
        ruleCode: "TRK_DASH_ZERO_META_POS",
        priority: 1,
        action: "FIX",
        ruleText: "TRACKING: Meta מדווח לידים שלא מופיעים בדשבורד",
        facts: [`לידים שמדווחים ב-Meta: ${formatCount(s.metaLeads)}`, "לידי Meta בדשבורד: 0"],
        reason: "הלידים לא נטענים לדשבורד, ולכן כל מדד לידים ביחידה חסר. זו בעיית מעקב, לא ביצועים.",
        confidence: "medium",
        nextCheck: "לבדוק שהלידים נטענים ממקור הטפסים ושהשיוך נכון לפני כל החלטה.",
      }),
    ];
  }

  return [];
}

/**
 * Zero leads (priority 4). Only when both sources confirm zero, spend is above the bar, and the day counts as complete.
 * Zero impressions is a delivery problem and is handled by its own rule.
 */
export function zeroLeadsFindings(ctx: RuleContext): Finding[] {
  const s = ctx.sel;
  if (!s.leadsKnown || ctx.entity.status !== "active") return [];
  if (s.spend <= ZERO_LEADS_MIN_SPEND || s.leads !== 0 || s.metaLeads !== 0) return [];
  if (s.impressions === 0) return [];

  const facts = [
    `הוצאה בטווח: ${formatIls(s.spend)} (מעל ${formatIls(ZERO_LEADS_MIN_SPEND)})`,
    "0 לידים ב-Meta וגם 0 לידים בדשבורד",
    `Impressions בטווח: ${formatCount(s.impressions)}`,
  ];

  if (ctx.selectedPartial) {
    return [
      makeFinding({
        ruleCode: "LEAD_ZERO_PARTIAL",
        priority: 4,
        action: "WARNING",
        ruleText: "הוצאה מעל 160 ₪ ו-0 לידים, והטווח כולל יום חלקי",
        facts,
        reason: "היום הנוכחי עדיין לא נגמר. 0 לידים עד סוף היום אינו הוכחה לכשל.",
        confidence: "low",
        missingData: ["היום הנוכחי חלקי"],
        nextCheck: "לבדוק שוב אחרי סוף היום, לפני כל החלטה.",
      }),
    ];
  }

  return [
    makeFinding({
      ruleCode: "LEAD_ZERO_CONFIRMED",
      priority: 4,
      action: "PAUSE_CANDIDATE",
      ruleText: "הוצאה מעל 160 ₪ ושני מקורות הנתונים מאשרים 0 לידים",
      facts,
      reason: "ההוצאה לא הניבה אף ליד בשני המקורות, בימים מלאים. מועמדות להשהיה לבדיקה ידנית, לא פעולה אוטומטית.",
      confidence: "high",
      nextCheck: "לבדוק את הטופס, ה-Pixel או הקישור ואת יעד המודעה לפני השהיה.",
    }),
  ];
}

/**
 * Lead quality (priority 2). Red Rate = Red / (Green + Red). Pending and Unmapped are outside the base.
 * Fewer than five classified leads gives no verdict. A sample under ten can reach WATCH at most.
 */
export function qualityFindings(ctx: RuleContext): Finding[] {
  const s = ctx.sel;
  if (!s.leadsKnown || s.unknownStatusLeads > 0) return [];
  if (s.classified < CLASSIFIED_INSUFFICIENT_BELOW || s.redRate === null) return [];
  if (s.redRate <= RED_RATE_OK_MAX) return [];

  const meaningful = classifiedMeaningful(s);
  const strong = s.redRate > RED_RATE_WARNING_MAX;
  let action: ActionCode = s.redRate <= RED_RATE_WATCH_MAX ? "WATCH" : "WARNING";
  if (!meaningful && action === "WARNING") action = "WATCH";

  return [
    makeFinding({
      ruleCode: "QLT_RED_RATE",
      priority: 2,
      action,
      flags: strong ? ["STRONG"] : [],
      ruleText: strong
        ? "אחוז אדום מעל 50% מהלידים המסווגים: בעיית איכות משמעותית"
        : "אחוז אדום מעל 20% מהלידים המסווגים (Green + Red)",
      facts: [
        `Red: ${formatCount(s.red)} מתוך ${formatCount(s.classified)} מסווגים (${formatPercent(s.redRate)})`,
        `Green: ${formatCount(s.green)} (${formatPercent(s.greenRate)})`,
      ],
      reason: strong
        ? "רוב הלידים המסווגים אדומים: הבעיה כנראה באיכות הליד, לא רק בעלות. לא עוצרים לפני בדיקה."
        : "חלק גבוה מהלידים המסווגים אדומים. Pending ו-Unmapped לא נכללים בחישוב.",
      confidence: meaningful ? "high" : "low",
      missingData: meaningful ? [] : [`מדגם של ${formatCount(s.classified)} לידים מסווגים בלבד`],
      nextCheck: "לבדוק את ההתאמה בין המודעה או הטופס לקהל, ואת שאלות הטופס.",
    }),
  ];
}

/**
 * CPL bands from the spec (cplTier). Severe CPL with registrations is a warning, never a pause. Severe CPL with no
 * registrations on a meaningful sample is a pause candidate. A small sample stays at WARNING.
 */
export function cplFindings(ctx: RuleContext): Finding[] {
  const s = ctx.sel;
  if (!s.leadsKnown || s.leads <= 0 || s.spend <= 0 || s.cpl === null) return [];

  const tier = cplTier(s.cpl);
  const facts = [`CPL: ${formatIls(s.cpl)} (${formatCount(s.leads)} לידים, הוצאה ${formatIls(s.spend)})`];
  const meaningful = leadSampleMeaningful(s);

  if (tier === "on_target" || tier === null) return [];

  if (tier === "follow_up") {
    return [
      makeFinding({
        ruleCode: "CPL_FOLLOW_UP",
        priority: 4,
        action: "WATCH",
        ruleText: "CPL מעל 80 ₪ ומתחת ל-100 ₪",
        facts,
        reason: "מעקב על מחיר הליד. לא עצירה.",
        confidence: meaningful ? "medium" : "low",
        missingData: meaningful ? [] : [`מדגם של ${formatCount(s.leads)} לידים`],
        nextCheck: "לעקוב אחרי שבוע נוסף ולהשוות את ה-CPL לתקופה הקודמת.",
      }),
    ];
  }

  if (tier === "warning") {
    return [
      makeFinding({
        ruleCode: "CPL_WARNING",
        priority: 4,
        action: "WARNING",
        ruleText: "CPL בין 100 ל-150 ₪",
        facts,
        reason: "העלות לליד גבוהה מהיעד. ההחלטה תלויה בהרשמות ובאיכות הלידים.",
        confidence: meaningful ? "medium" : "low",
        missingData: meaningful ? [] : [`מדגם של ${formatCount(s.leads)} לידים`],
        nextCheck: "לבדוק את ה-CPA ואת איכות הלידים לפני שינוי.",
      }),
    ];
  }

  // severe: 150 ₪ and up
  if (s.sales >= 1) {
    return [
      makeFinding({
        ruleCode: "CPL_SEVERE_WITH_SALES",
        priority: 4,
        action: "WARNING",
        ruleText: "CPL של 150 ₪ ומעלה, אבל יש הרשמות שמצדיקות את ההוצאה",
        facts: [...facts, `הרשמות בטווח: ${formatCount(s.sales)}`],
        reason: "CPL גבוה אינו הוראת עצירה כשההרשמות מצדיקות את ההוצאה. מוצגת אזהרה בלבד.",
        confidence: meaningful ? "medium" : "low",
        nextCheck: "לבדוק את עלות ההרשמה (CPA) לפני כל שינוי.",
      }),
    ];
  }

  if (meaningful) {
    return [
      makeFinding({
        ruleCode: "CPL_SEVERE_NO_SALES",
        priority: 4,
        action: "PAUSE_CANDIDATE",
        ruleText: "CPL של 150 ₪ ומעלה, בלי הרשמות, במדגם מספיק",
        facts,
        reason: "חריגה חמורה בעלות לליד, בלי הרשמות, על מדגם מספיק. מועמדות להשהיה לבדיקה ידנית.",
        confidence: "high",
        nextCheck: "לבדוק את איכות הלידים והטופס לפני השהיה.",
      }),
    ];
  }

  return [
    makeFinding({
      ruleCode: "CPL_SEVERE_SMALL_SAMPLE",
      priority: 4,
      action: "WARNING",
      ruleText: "CPL של 150 ₪ ומעלה, במדגם קטן",
      facts,
      reason: "חריגה בעלות, אבל המדגם קטן. עדיין לא מועמדות להשהיה.",
      confidence: "low",
      missingData: [`מדגם של ${formatCount(s.leads)} לידים בלבד`],
      nextCheck: "לחכות למדגם של לפחות 10 לידים לפני החלטה.",
    }),
  ];
}

/** CPL trend (priority 4). A 25% rise with meaningful samples on both sides is a WATCH, with the likely cause to check. */
export function cplTrendFindings(ctx: RuleContext): Finding[] {
  const changes = trendChanges(ctx.cur, ctx.prev);
  if (changes.cpl === null || changes.cpl < CPL_RISE_FATIGUE || !ctx.cur) return [];

  const ctrDropped = changes.ctr !== null && changes.ctr <= -25;
  return [
    makeFinding({
      ruleCode: "CPL_TREND_RISE",
      priority: 4,
      action: "WATCH",
      ruleText: "CPL עלה ב-25% ומעלה לעומת התקופה הקודמת, במדגם מספיק בשתי התקופות",
      facts: [
        `CPL בתקופה הנוכחית: ${formatIls(ctx.cur.cpl)} לעומת ${formatIls(ctx.prev?.cpl ?? null)} (${formatChange(changes.cpl)})`,
        `Link CTR: ${formatChange(changes.ctr)} מול התקופה הקודמת`,
      ],
      reason: ctrDropped
        ? "CTR ירד לצד עליית ה-CPL. זו השערה: ייתכן שההוק או המסר חלשים. לא עובדה עד לבדיקה."
        : "CTR לא ירד, אבל ה-CPL עלה. זו השערה: ייתכן שהבעיה בטופס, בדף הנחיתה או בהתאמת המסר. לא עובדה עד לבדיקה.",
      confidence: "medium",
      nextCheck: ctrDropped
        ? "לבדוק Hook / Visual / Message של המודעה."
        : "לבדוק Form / Landing Page / Message Match.",
    }),
  ];
}

/**
 * CPA and registrations (priority 3, scale candidates at 8). Spend / Sales. CPA below 2,000 ₪ is positive; a scale
 * candidate also needs three registrations in a 7-day window and stability, which the engine checks afterwards.
 */
export function cpaFindings(ctx: RuleContext): Finding[] {
  const s = ctx.sel;
  if (!s.leadsKnown || s.unknownStatusLeads > 0 || s.spend <= 0) return [];

  if (s.sales === 0) {
    if (s.spend >= CPA_HIGH_FROM && leadSampleMeaningful(s)) {
      return [
        makeFinding({
          ruleCode: "CPA_NO_REGISTRATIONS",
          priority: 3,
          action: "WATCH",
          ruleText: "אין הרשמות מול הוצאה של 3,000 ₪ ומעלה",
          facts: [`הוצאה בטווח: ${formatIls(s.spend)}`, `לידים: ${formatCount(s.leads)}, הרשמות: 0`],
          reason: "אין הרשמות אף שיש לידים. לא מוצגת השהיה: הרשמה נבחנת לפי מדגם ומגמה, ו-CPL לבדו אינו מספיק.",
          confidence: "medium",
          nextCheck: "לבדוק את הטופס ואת תהליך המעקב לפני החלטה על היחידה.",
        }),
      ];
    }
    return [];
  }

  const cpa = s.cpa;
  if (cpa === null) return [];
  const facts = [`הרשמות: ${formatCount(s.sales)}`, `CPA: ${formatIls(cpa)} (הוצאה ${formatIls(s.spend)})`];

  if (cpa < CPA_POSITIVE_BELOW) {
    if (s.sales >= SCALE_MIN_REGISTRATIONS && ctx.rangeDays === WEEKLY_ANALYSIS_DAYS) {
      return [
        makeFinding({
          ruleCode: "CPA_SCALE_CANDIDATE",
          priority: 8,
          action: "SCALE_CANDIDATE",
          ruleText: "3 הרשמות ומעלה ב-7 ימים, וגם CPA מתחת ל-2,000 ₪",
          facts,
          reason: "אות חיובי חוזר. ההגדלה כפופה ליציבות: אם ביחידה יש אזהרה פעילה, היא לא תוצג.",
          confidence: "high",
          nextCheck: "לבדוק את היציבות לאורך השבוע, ואז להחליט על הגדלה ידנית. אין שינוי תקציב אוטומטי.",
        }),
      ];
    }
    if (s.sales === STRONG_KEEP_REGISTRATIONS) {
      return [
        makeFinding({
          ruleCode: "CPA_STRONG_KEEP",
          priority: 3,
          action: "KEEP",
          secondaryAction: "STRONG KEEP / CHECK SCALE",
          flags: ["CHECK_SCALE"],
          ruleText: "2 הרשמות וגם CPA מתחת ל-2,000 ₪",
          facts,
          reason: "שתי הרשמות ב-CPA טוב: אות חיובי, אבל המדגם עדיין קטן.",
          confidence: "medium",
          nextCheck: "לבדוק הגדלה רק אחרי שבוע עם הרשמות נוספות.",
        }),
      ];
    }
    if (s.sales >= SCALE_MIN_REGISTRATIONS) {
      return [
        makeFinding({
          ruleCode: "CPA_CHECK_SCALE_OUT_OF_WINDOW",
          priority: 3,
          action: "KEEP",
          secondaryAction: "CHECK SCALE",
          flags: ["CHECK_SCALE"],
          ruleText: "3 הרשמות ומעלה וגם CPA מתחת ל-2,000 ₪, אבל הטווח אינו 7 ימים",
          facts,
          reason: "ספירה שבועית נדרשת כדי להכריע על הגדלה. בטווח הנוכחי ההכרעה נשארת פתוחה.",
          confidence: "medium",
          nextCheck: "להריץ ניתוח על 7 ימים לפני החלטה על הגדלה.",
        }),
      ];
    }
    return [
      makeFinding({
        ruleCode: "CPA_POSITIVE_SMALL",
        priority: 3,
        action: "KEEP",
        ruleText: "הרשמה אחת וגם CPA מתחת ל-2,000 ₪",
        facts,
        reason: "אות חיובי, אבל מדגם קטן.",
        confidence: "low",
        missingData: ["מדגם של הרשמה אחת בלבד"],
        nextCheck: "לחכות לעוד הרשמות לפני כל החלטה.",
      }),
    ];
  }

  if (cpa <= CPA_HIGH_FROM) {
    return [
      makeFinding({
        ruleCode: "CPA_ACCEPTABLE",
        priority: 3,
        action: "KEEP",
        ruleText: "CPA בין 2,000 ל-3,000 ₪",
        facts,
        reason: "עלות הרשמה בטווח הביניים: להשאיר ולעקוב.",
        confidence: leadSampleMeaningful(s) ? "medium" : "low",
        nextCheck: "לעקוב אחרי המגמה בשבוע הבא.",
      }),
    ];
  }

  // CPA above 3,000 ₪: a pause candidate only on a meaningful sample with no improvement against the previous period
  const improving = ctx.cur?.cpa != null && ctx.prev?.cpa != null && ctx.cur.cpa < ctx.prev.cpa;
  // "No improvement" is only a finding when the comparison exists; without it, the check is reported as missing.
  const hasComparison = ctx.cur?.cpa != null && ctx.prev?.cpa != null;
  if (leadSampleMeaningful(s) && !improving) {
    return [
      makeFinding({
        ruleCode: "CPA_HIGH_PAUSE_CANDIDATE",
        priority: 3,
        action: "PAUSE_CANDIDATE",
        ruleText: "CPA מעל 3,000 ₪, במדגם מספיק, בלי שיפור מול התקופה הקודמת",
        facts,
        reason: "עלות הרשמה גבוהה על מדגם מספיק, בלי שיפור. מועמדות להשהיה לבדיקה ידנית.",
        confidence: hasComparison ? "high" : "medium",
        missingData: hasComparison ? [] : ["אין תקופת השוואה עם CPA: לא נבדק אם העלות השתפרה"],
        nextCheck: "לבדוק את איכות הלידים ואת מסלול המכירה לפני השהיה.",
      }),
    ];
  }

  return [
    makeFinding({
      ruleCode: "CPA_HIGH_WATCH",
      priority: 3,
      action: "WATCH",
      ruleText: "CPA מעל 3,000 ₪, אבל המדגם קטן או שיש שיפור",
      facts,
      reason: "עלות הרשמה גבוהה, אבל ההחלטה נשארת לתקופה הבאה.",
      confidence: "low",
      nextCheck: "לעקוב אחרי עוד שבוע, ולהשוות שוב.",
    }),
  ];
}
