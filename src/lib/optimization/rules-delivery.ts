import { CPL_SEVERE_FROM, CPL_WARNING_FROM } from "@/lib/performance/cpl-tier";
import { classifiedMeaningful, leadSampleMeaningful, trendChanges, type RuleContext } from "@/lib/optimization/context";
import type { CampaignConcentration } from "@/lib/optimization/budget";
import { makeFinding } from "@/lib/optimization/finding";
import { formatChange, formatCount, formatIls, formatIlsExact, formatPercent, formatRatio } from "@/lib/optimization/format";
import type { Finding } from "@/lib/optimization/model";
import {
  CONCENTRATION_SHARE_MIN,
  CPA_HIGH_FROM,
  CPC_RISE_STRONG,
  CPC_RISE_WARNING,
  CPL_RISE_FATIGUE,
  CPM_RISE_STRONG,
  CPM_RISE_WARNING,
  CTR_DROP_STRONG,
  CTR_DROP_WARNING,
  FREQUENCY_FATIGUE_ABOVE,
  FREQUENCY_OK_MAX,
  FREQUENCY_WARNING_MAX,
  FREQUENCY_WATCH_MAX,
  RED_RATE_WATCH_MAX,
  REACH_DROP_WARNING,
  REACH_DROP_WATCH,
  SPEND_STABLE_BAND,
  WEEKLY_ANALYSIS_DAYS,
} from "@/lib/optimization/thresholds";

/** Zero impressions on an active, complete day is a delivery problem to fix, not a data gap. */
export function zeroImpressionsFindings(ctx: RuleContext): Finding[] {
  if (ctx.entity.status !== "active" || ctx.selectedPartial || ctx.sel.impressions !== 0) return [];
  // The parent already carries the same delivery problem, so the lowest justified level is the parent.
  if (ctx.parentZeroImpressions) return [];
  return [
    makeFinding({
      ruleCode: "DLV_ZERO_IMPRESSIONS",
      priority: 5,
      action: "FIX",
      ruleText: "פעיל, עבר יום פעילות מלא, הנתונים מעודכנים, ו-0 Impressions",
      facts: ["Impressions בטווח: 0", "סטטוס: פעיל"],
      reason: "בעיית אספקה לבדוק, לא חוסר נתונים: הטווח כולל ימים מלאים ומעודכנים.",
      confidence: "high",
      nextCheck: "לבדוק ב-Meta: delivery, budget, schedule ו-approval של היחידה.",
    }),
  ];
}

/**
 * Reach drop (priority 5). A drop of 30% or more with spend held within ±20% is a delivery change, not a budget change.
 * It is never a stop signal by itself: WATCH, or WARNING from a 50% drop.
 */
export function reachFindings(ctx: RuleContext): Finding[] {
  if (!ctx.cur || !ctx.prev) return [];
  const changes = trendChanges(ctx.cur, ctx.prev);
  if (changes.reach === null || changes.reach > -REACH_DROP_WATCH) return [];
  if (changes.spend === null || Math.abs(changes.spend) > SPEND_STABLE_BAND) return [];

  const strong = changes.reach <= -REACH_DROP_WARNING;
  return [
    makeFinding({
      ruleCode: "VOL_REACH_DROP",
      priority: 5,
      action: strong ? "WARNING" : "WATCH",
      ruleText: "ירידה בתפוצה (Reach) של 30% ומעלה, עם הוצאה יציבה (±20%)",
      facts: [
        `Reach: ${formatCount(ctx.cur.reach)} לעומת ${formatCount(ctx.prev.reach)} (${formatChange(changes.reach)})`,
        `הוצאה: ${formatIls(ctx.cur.spend)} לעומת ${formatIls(ctx.prev.spend)} (${formatChange(changes.spend)})`,
      ],
      reason: "ירידה בתפוצה בלי שינוי בהוצאה: סימן לרוויית קהל או לשינוי בתנאי ההצגה. לא עוצרים קמפיין בגלל Reach בלבד.",
      confidence: "medium",
      missingData: ["אין במערכת רישום של שינויי פעילות או קהל: ההמלצה מניחה שלא היו"],
      nextCheck: "לבדוק ב-Meta שינויי קהל, תקציב ותזמון בתקופה, ולהשוות שוב אחרי 7 ימים.",
    }),
  ];
}

/**
 * Frequency (priority 6). The weekly thresholds apply only to a selection of exactly 7 days, for a new audience.
 * Any other length is shown without a verdict. Frequency never causes a pause by itself.
 */
export function frequencyFindings(ctx: RuleContext): Finding[] {
  const s = ctx.sel;
  if (ctx.rangeDays !== WEEKLY_ANALYSIS_DAYS || s.frequency === null || s.reach <= 0) return [];
  const f = s.frequency;
  if (f <= FREQUENCY_OK_MAX) return [];

  const facts = [`Frequency: ${formatRatio(f)} (${formatCount(s.impressions)} Impressions / ${formatCount(s.reach)} Reach)`];
  const missingData = ["סוג הקהל (חדש או רימרקטינג) לא מסומן במערכת: הסף מיושם כקהל חדש"];
  const nextCheck = "לבדוק את סוג הקהל וגודלו. להחליף קריאייטיב או להרחיב קהל לפני כל החלטה. אין PAUSE בגלל Frequency בלבד.";

  if (f <= FREQUENCY_WATCH_MAX) {
    return [
      makeFinding({
        ruleCode: "FRQ_WATCH",
        priority: 6,
        action: "WATCH",
        ruleText: "Frequency מעל 2.5 בטווח של 7 ימים",
        facts,
        reason: "תדירות בטווח האזהרה הראשון.",
        confidence: "medium",
        missingData,
        nextCheck,
      }),
    ];
  }
  if (f <= FREQUENCY_WARNING_MAX) {
    return [
      makeFinding({
        ruleCode: "FRQ_WARNING",
        priority: 6,
        action: "WARNING",
        ruleText: "Frequency מעל 3.5 בטווח של 7 ימים",
        facts,
        reason: "תדירות גבוהה: הקהל רואה את המודעה שוב ושוב.",
        confidence: "medium",
        missingData,
        nextCheck,
      }),
    ];
  }
  return [
    makeFinding({
      ruleCode: "FRQ_HIGH",
      priority: 6,
      action: "WARNING",
      flags: ["HIGH_PRIORITY"],
      ruleText: "Frequency מעל 4.5 בטווח של 7 ימים: בדיקה בעדיפות גבוהה",
      facts,
      reason: "תדירות גבוהה מאוד. בדיקה בעדיפות גבוהה, בלי השהיה אוטומטית.",
      confidence: "medium",
      missingData,
      nextCheck,
    }),
  ];
}

/**
 * Creative and click signals (priority 6): creative fatigue, CTR drop, CPC rise. Each one is a hypothesis to check,
 * never a pause. The "why" text names what to check, and it says when the cause is not yet proven.
 */
export function creativeFindings(ctx: RuleContext): Finding[] {
  const { cur, prev, sel } = ctx;
  if (!cur || !prev) return [];
  const changes = trendChanges(cur, prev);
  const out: Finding[] = [];

  const ctrDrop = changes.ctr !== null && changes.ctr <= -CTR_DROP_WARNING;
  const cplRise = changes.cpl !== null && changes.cpl >= CPL_RISE_FATIGUE;
  const fatigueRisk = ctx.rangeDays === WEEKLY_ANALYSIS_DAYS && sel.frequency !== null && sel.frequency > FREQUENCY_FATIGUE_ABOVE;

  if (fatigueRisk && (ctrDrop || cplRise)) {
    const businessOk = sel.cpl !== null && sel.cpl <= CPL_WARNING_FROM && (sel.redRate === null || sel.redRate <= RED_RATE_WATCH_MAX);
    out.push(
      makeFinding({
        ruleCode: "CRV_FATIGUE",
        priority: 6,
        action: businessOk ? "KEEP" : "WATCH",
        secondaryAction: businessOk ? "WATCH / TEST CREATIVE" : "TEST CREATIVE",
        ruleText: "Frequency מעל 3.5 יחד עם ירידה ב-CTR או עלייה ב-CPL: חשד לשחיקת קריאייטיב",
        facts: [
          `Frequency: ${formatRatio(sel.frequency)}`,
          `Link CTR: ${formatChange(changes.ctr)} מול התקופה הקודמת`,
          `CPL: ${formatChange(changes.cpl)} מול התקופה הקודמת`,
        ],
        reason: businessOk
          ? "התוצאות העסקיות עדיין טובות: לא PAUSE. מעקב ובדיקת קריאייטיב חדש."
          : "התוצאות העסקיות נחלשו יחד עם השחיקה: מעקב ובדיקת קריאייטיב. לא PAUSE מתוך חשד בלבד.",
        confidence: "medium",
        nextCheck: "לבדוק קריאייטיב חדש בבדיקה מבוקרת, ולעקוב אחרי ה-CTR וה-CPL.",
      })
    );
  }

  if (ctrDrop) {
    out.push(
      makeFinding({
        ruleCode: "CRV_CTR_DROP",
        priority: 6,
        action: "WARNING",
        flags: changes.ctr !== null && changes.ctr <= -CTR_DROP_STRONG ? ["STRONG"] : [],
        ruleText: "Link CTR ירד ב-25% ומעלה לעומת התקופה הקודמת",
        facts: [`Link CTR: ${formatPercent(cur.ctr, 2)} לעומת ${formatPercent(prev.ctr, 2)} (${formatChange(changes.ctr)})`],
        reason: "ייתכן שההוק, הוויזואל או המסר חלשים. זו השערה עד לבדיקה, לא עובדה.",
        confidence: "medium",
        nextCheck: "לבדוק Hook / Visual / Message של המודעה.",
      })
    );
  }

  if (changes.cpc !== null && changes.cpc >= CPC_RISE_WARNING) {
    out.push(
      makeFinding({
        ruleCode: "CRV_CPC_RISE",
        priority: 6,
        action: "WARNING",
        flags: changes.cpc >= CPC_RISE_STRONG ? ["STRONG"] : [],
        ruleText: "Link CPC עלה ב-25% ומעלה לעומת התקופה הקודמת",
        facts: [`Link CPC: ${formatIlsExact(cur.cpc)} לעומת ${formatIlsExact(prev.cpc)} (${formatChange(changes.cpc)})`],
        reason: "עלייה ב-CPC יכולה לנבוע ממחיר מכרז או מירידה ברלוונטיות. לא עוצרים לבד.",
        confidence: "medium",
        nextCheck: "להשוות CTR ו-CPM כדי להבחין בין הסיבות.",
      })
    );
  }

  return out;
}

/** CPM rise (priority 5, delivery): a higher price per thousand impressions points to delivery conditions, not creative. */
export function cpmFindings(ctx: RuleContext): Finding[] {
  if (!ctx.cur || !ctx.prev) return [];
  const changes = trendChanges(ctx.cur, ctx.prev);
  if (changes.cpm === null || changes.cpm < CPM_RISE_WARNING) return [];
  return [
    makeFinding({
      ruleCode: "DLV_CPM_RISE",
      priority: 5,
      action: "WARNING",
      flags: changes.cpm >= CPM_RISE_STRONG ? ["STRONG"] : [],
      ruleText: "CPM עלה ב-25% ומעלה לעומת התקופה הקודמת",
      facts: [`CPM: ${formatIlsExact(ctx.cur.cpm)} לעומת ${formatIlsExact(ctx.prev.cpm)} (${formatChange(changes.cpm)})`],
      reason: "עלייה ב-CPM מצביעה על מחיר חשיפה, לא על איכות הקריאייטיב. לא עוצרים לבד.",
      confidence: "medium",
      nextCheck: "לבדוק delivery, placements ותנאי הקהל (audience conditions).",
    }),
  ];
}

/**
 * Budget concentration (priority 7). Only the dominant ad of a concentrated campaign gets a verdict. It is weak when
 * its meaningful sample shows a severe CPL, a high red rate or a high CPA. It is good when its CPL is below the warning band.
 * Otherwise there is no verdict and the finding says why.
 */
export function concentrationFindings(ctx: RuleContext, concentration: CampaignConcentration | undefined): Finding[] {
  if (!concentration || concentration.status !== "concentrated" || concentration.dominantAdId !== ctx.entity.id) return [];
  const s = ctx.sel;
  const trusted = s.leadsKnown && s.unknownStatusLeads === 0;
  const weak =
    trusted &&
    ((leadSampleMeaningful(s) && s.cpl !== null && s.cpl >= CPL_SEVERE_FROM) ||
      (classifiedMeaningful(s) && s.redRate !== null && s.redRate > RED_RATE_WATCH_MAX) ||
      (leadSampleMeaningful(s) && s.cpa !== null && s.cpa >= CPA_HIGH_FROM));
  const good = trusted && !weak && s.cpl !== null && s.cpl < CPL_WARNING_FROM;

  const facts = [
    `המודעה קיבלה ${CONCENTRATION_SHARE_MIN}% ומעלה מהתקציב של הקמפיין ${concentration.streakDays} ימים מלאים רצופים`,
    `ימים מלאים שנבדקו: ${concentration.completeDays}`,
    `הוצאה בטווח: ${formatIls(s.spend)}`,
  ];

  if (weak) {
    return [
      makeFinding({
        ruleCode: "BUD_CONCENTRATION_WEAK",
        priority: 7,
        action: "PAUSE_CANDIDATE",
        secondaryAction: "הפחתת תקציב מועמדת (REDUCE CANDIDATE)",
        ruleText: "ריכוז תקציב במודעה אחת, והמודעה הדומיננטית חלשה",
        facts,
        reason: "המודעה הדומיננטית קיבלה את רוב התקציב והתוצאה חלשה: מועמדת להפחתה או להשהיה לבדיקה ידנית.",
        confidence: "medium",
        nextCheck: "לבדוק את המודעה לפני כל הפחתה. אין שינוי תקציב אוטומטי.",
      }),
    ];
  }

  if (good) {
    return [
      makeFinding({
        ruleCode: "BUD_CONCENTRATION_GOOD",
        priority: 7,
        action: "KEEP",
        secondaryAction: "בדיקה מבוקרת (TEST)",
        ruleText: "ריכוז תקציב במודעה אחת, והמודעה הדומיננטית טובה",
        facts,
        reason: "המודעה הדומיננטית מניבה תוצאה טובה: להשאיר, ולבדוק את שאר המודעות בבדיקה מבוקרת בלי לשנות את כל התקציב בבת אחת.",
        confidence: "medium",
        nextCheck: "להקצות חלק קטן מהתקציב לבדיקה מבוקרת של מודעות אחרות.",
      }),
    ];
  }

  return [
    makeFinding({
      ruleCode: "BUD_CONCENTRATION_UNDECIDED",
      priority: 7,
      action: "WATCH",
      ruleText: "ריכוז תקציב במודעה אחת, אבל אין מספיק נתונים להכרעה",
      facts,
      reason: "אין מדגם מספיק כדי לדעת אם המודעה הדומיננטית טובה או חלשה.",
      confidence: "low",
      missingData: ["מדגם לידים לא מספיק להכרעה על המודעה הדומיננטית"],
      nextCheck: "לחכות למדגם גדול יותר לפני כל החלטה.",
    }),
  ];
}
