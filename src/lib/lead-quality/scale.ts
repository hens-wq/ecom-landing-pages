import type { DateRange } from "@/lib/advertising/types";
import type { AdSet, Campaign, EntityStatus } from "@/lib/types";
import type { LeadQualityColor, LeadQualityReport, LeadQualityRow, LeadStudentRatingSummary } from "./types";
import { buildAdClosureSummaries, type AdClosureSummary } from "./ad-closures";

export interface ScaleBudget {
  daily: number | null;
  lifetime: number | null;
}
export type ScaleCampaign = Campaign & {
  budget?: ScaleBudget;
  adSets: Array<AdSet & { budget?: ScaleBudget }>;
};
export type ScaleStatus = "candidate" | "review" | "none" | "unavailable";
export type ScaleTier = "excellent" | "reasonable" | "expensive" | "unknown" | "none";
export type ScaleIncreasePercent = 10 | 20;

export interface ScaleBudgetTarget {
  id: string;
  level: "campaign" | "adset";
  name: string;
  currentDaily: number;
  proposedDaily: number;
  increaseDaily: number;
  increasePercent: ScaleIncreasePercent;
}

export interface CampaignScaleAssessment {
  campaignId: string;
  /** Every observed registration qualifies for consideration; confidence and numeric proposals are separate. */
  candidate: boolean;
  status: ScaleStatus;
  action: "increase" | "review" | "reactivate_review" | "wait";
  tier: ScaleTier;
  /** Internal prioritisation score, never a statistical confidence or a Meta score. */
  score: number;
  badge: { label: string; color: LeadQualityColor };
  range: DateRange;
  basis: string;
  spend: number | null;
  registrations: number;
  cpa: number | null;
  qualityRates: { relevant: number | null; irrelevant: number | null; undetermined: number | null };
  /** CRM student ratings are a separate quality signal, never registrations or revenue. */
  studentRating?: LeadStudentRatingSummary;
  confidence: "limited" | "moderate";
  sampleNote: string;
  dataComplete: boolean;
  reasons: string[];
  /** Policy guidance only. Actual daily amounts, if available, are listed solely in budgetTargets. */
  increasePercent: ScaleIncreasePercent | null;
  budgetMode: "campaign_daily" | "adset_daily" | "lifetime" | "unknown";
  budgetTargets: ScaleBudgetTarget[];
  /** Own-attribution registrations for all ads in this same fixed cohort, without full status columns. */
  adClosures?: AdClosureSummary[];
}

export interface BuildScaleAssessmentsInput {
  /** Fixed rolling 30-day cohort, inclusive of today; this is independent of the visible date selector. */
  report: LeadQualityReport;
  campaigns: readonly ScaleCampaign[];
  hasUnlistedSpend?: boolean;
  source?: "meta" | "mock";
}

export interface ScaleAnalysisResponse {
  assessments: CampaignScaleAssessment[];
  metadata: {
    range: DateRange;
    generatedAt: string;
    source: "meta" | "mock";
    notices: string[];
  };
}

export const SCALE_COHORT_BASIS = "לידים שנקלטו ב־30 הימים האחרונים, כולל היום, לפי סטטוס ההרשמה הנוכחי. החישוב אינו לפי תאריך סגירת העסקה";

function positive(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
function budgetKind(budget: ScaleBudget | undefined): "daily" | "lifetime" | "none" | "invalid" {
  if (!budget) return "none";
  if ([budget.daily, budget.lifetime].some((amount) => amount !== null && (!Number.isFinite(amount) || amount < 0))) return "invalid";
  if (positive(budget.daily) && positive(budget.lifetime)) return "invalid";
  if (positive(budget.lifetime)) return "lifetime";
  return positive(budget.daily) ? "daily" : "none";
}
function unknownStatuses(row: LeadQualityRow): boolean {
  return row.unknownStatusLeads > 0 || row.summary.unknown.count > 0 || row.summary.unmapped.count > 0;
}
function registrationsOf(row: LeadQualityRow): number {
  const value = row.summary.sales.count;
  return Number.isInteger(value) && value >= 0 ? value : 0;
}
function validCounts(row: LeadQualityRow): boolean {
  return Number.isInteger(row.summary.sales.count) && row.summary.sales.count >= 0 && row.summary.sales.count <= row.totalLeads;
}
function isThirtyDayRange(range: DateRange): boolean {
  const dates = [range.since, range.until].map((date) => /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00Z`) : new Date(NaN));
  return dates.every((date, index) => Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === [range.since, range.until][index])
    && (dates[1].getTime() - dates[0].getTime()) / 86_400_000 === 29;
}
function policyPercent(cpa: number, registrations: number): ScaleIncreasePercent | null {
  if (cpa <= 1500) return registrations >= 3 ? 20 : 10;
  return cpa <= 3000 ? 10 : null;
}
function targetFor(id: string, level: ScaleBudgetTarget["level"], name: string, currentDaily: number, increasePercent: ScaleIncreasePercent): ScaleBudgetTarget | null {
  const current = money(currentDaily);
  const proposed = money(current * (1 + increasePercent / 100));
  if (!Number.isFinite(proposed) || proposed <= current) return null;
  return { id, level, name, currentDaily: current, proposedDaily: proposed, increaseDaily: money(proposed - current), increasePercent };
}
function campaignState(row: LeadQualityRow, source: ScaleCampaign | undefined): EntityStatus | null {
  return source?.status ?? row.status;
}
function currentBudgetMode(source: ScaleCampaign | undefined): CampaignScaleAssessment["budgetMode"] {
  const kind = budgetKind(source?.budget);
  if (kind === "daily") return "campaign_daily";
  if (kind === "lifetime") return "lifetime";
  const sets = source?.adSets ?? [];
  if (sets.some((adSet) => budgetKind(adSet.budget) === "daily")) return "adset_daily";
  return sets.some((adSet) => budgetKind(adSet.budget) === "lifetime") ? "lifetime" : "unknown";
}

/**
 * Proposed INTERNAL business policy, not a promise about Meta delivery or learning:
 * any observed enrolment qualifies for consideration. At CPA <= 1,500 ILS, 3+ enrolments suggest +20%, otherwise +10%;
 * at CPA <= 3,000 ILS suggest +10%. Higher CPA remains a review candidate without a numeric increase.
 * This function only describes recommendations. It never mutates a budget, contact, campaign or status.
 */
export function buildScaleAssessments(input: BuildScaleAssessmentsInput): CampaignScaleAssessment[] {
  const { report } = input;
  const sourceById = new Map(input.campaigns.map((campaign) => [campaign.id, campaign]));
  const fixedWindow = isThirtyDayRange(report.range);
  const unlistedSpend = input.hasUnlistedSpend === true || report.unlistedSpend > 0;
  const demo = input.source === "mock";

  return report.campaigns.filter((row) => !row.isUnassigned && !row.isUnlisted).map((row): CampaignScaleAssessment => {
    const sourceCampaign = sourceById.get(row.id);
    const registrations = registrationsOf(row);
    const studentRating = demo ? undefined : row.summary.studentRating;
    const excellentCount = studentRating?.excellent.count;
    const knownExcellent = typeof excellentCount === "number" && Number.isInteger(excellentCount) && excellentCount > 0 && excellentCount <= row.totalLeads ? excellentCount : 0;
    const ratingPartial = Boolean(studentRating && (!studentRating.complete || !row.leadsKnown));
    const spend = row.spend !== null && Number.isFinite(row.spend) && row.spend >= 0 ? row.spend : null;
    const dataComplete = row.leadsKnown && !unknownStatuses(row) && validCounts(row) && fixedWindow && !unlistedSpend && !demo;
    const cpa = dataComplete && registrations > 0 && positive(spend) ? money(spend / registrations) : null;
    const candidate = registrations >= 1 && !demo;
    const confidence = registrations >= 3 && dataComplete ? "moderate" : "limited";
    const tier: ScaleTier = !candidate ? "none" : cpa === null ? "unknown" : cpa <= 1500 ? "excellent" : cpa <= 3000 ? "reasonable" : "expensive";
    const score = tier === "excellent" ? (confidence === "moderate" ? 90 : 75) : tier === "reasonable" ? (confidence === "moderate" ? 70 : 60) : tier === "expensive" ? 30 : candidate ? 15 : 0;
    const assessment: CampaignScaleAssessment = {
      campaignId: row.id, candidate,
      status: candidate ? "review" : dataComplete ? "none" : "unavailable",
      action: candidate ? "review" : "wait", tier, score,
      badge: { label: candidate ? "מועמד לסקייל לבדיקה" : dataComplete ? "טרם מועמד לסקייל" : "חסרים נתונים לסקייל", color: candidate ? "orange" : "neutral" },
      range: { ...report.range }, basis: SCALE_COHORT_BASIS, spend, registrations, cpa,
      qualityRates: {
        relevant: row.leadsKnown ? row.summary.relevant.percent : null,
        irrelevant: row.leadsKnown ? row.summary.irrelevant.percent : null,
        undetermined: row.leadsKnown ? row.summary.undetermined.percent : null,
      },
      ...(studentRating ? { studentRating } : {}),
      confidence,
      sampleNote: demo ? "נתוני הדגמה אינם בסיס להערכת סקייל" : registrations >= 1 && registrations <= 2
        ? "מדגם קטן של 1–2 הרשמות: האות חיובי, אך ההצעה זהירה ואינה ודאות סטטיסטית"
        : confidence === "moderate" ? "הצטברו לפחות 3 הרשמות; רמת הביסוס בינונית ואינה ודאות סטטיסטית"
        : registrations >= 3 ? "נצפו לפחות 3 הרשמות, אך הנתונים אינם מלאים ורמת הביסוס מוגבלת" : "טרם נצפתה הרשמה בחלון הבדיקה",
      dataComplete, reasons: [], increasePercent: null, budgetMode: currentBudgetMode(sourceCampaign), budgetTargets: [],
      adClosures: buildAdClosureSummaries({ campaign: row, sourceCampaign, source: input.source }),
    };
    const reasons = assessment.reasons;
    if (candidate) reasons.push(`נצפו ${registrations} הרשמות מהלידים בחלון הבדיקה; גם הרשמה אחת מספיקה למועמדות`);
    if (knownExcellent > 0) reasons.push(`נצפו ${ratingPartial ? "לפחות " : ""}${knownExcellent} לידים מצוינים בדירוג תלמיד 4–5 בחלון הבדיקה; הדירוג הוא מדד איכות נפרד מהרשמה`);
    if (!row.leadsKnown) reasons.push("חלק ממקורות הלידים לא נטענו, ולכן אין בסיס להעלאה מספרית");
    if (unknownStatuses(row)) reasons.push("קיימים סטטוסים חסרים או שלא מופו; יש להשלים את המידע לפני העלאה");
    if (!validCounts(row)) reasons.push("ספירת ההרשמות אינה עקבית עם מספר הלידים ויש לבדוק את הנתונים");
    if (!fixedWindow) reasons.push("חלון הבדיקה אינו 30 ימים רצופים; ההמלצה ממתינה לטעינת הטווח הקבוע");
    if (unlistedSpend) reasons.push("קיימת הוצאה ללא שיוך ברשימת הקמפיינים, ולכן העלות להרשמה עלולה להיות חסרה");
    if (demo) reasons.push("אלה נתוני הדגמה; לא מוצעת העלאת תקציב על בסיסם");
    if (!candidate) {
      if (knownExcellent > 0) {
        assessment.status = "review";
        assessment.action = "review";
        assessment.badge = { label: "לידים מצוינים", color: "green" };
        assessment.basis = "דירוג התלמיד הנוכחי של לידים שנקלטו ב־30 הימים האחרונים, כולל היום. הדירוג מצביע על איכות הליד ואינו הרשמה או הכנסה";
        assessment.sampleNote = ratingPartial
          ? "נתוני הדירוג חלקיים; הלידים המצוינים שנצפו הם אות איכות למעקב, ואינם הרשמות"
          : "דירוג תלמיד 4–5 הוא אות איכות למעקב; טרם נצפתה הרשמה בחלון הבדיקה";
        reasons.push("לידים מצוינים ללא הרשמות מסומנים לבדיקת איכות בלבד; לא מוצעת הגדלת תקציב על בסיס הדירוג");
        return assessment;
      }
      if (dataComplete) reasons.push("אין הרשמות מהלידים שנקלטו בחלון הבדיקה; ממשיכים לעקוב");
      return assessment;
    }
    const active = campaignState(row, sourceCampaign) === "active";
    if (!active) {
      assessment.action = "reactivate_review";
      assessment.badge = { label: "סקייל לבדיקה, קמפיין לא פעיל", color: "orange" };
      reasons.push("הקמפיין אינו פעיל; בוחנים הפעלה מחדש לפני כל הצעת הגדלה");
    }
    if (!dataComplete) return assessment;
    if (!positive(spend) || cpa === null) {
      reasons.push("אין הוצאה חיובית ותקינה לחישוב עלות להרשמה; יש לבדוק את הכדאיות לפני הגדלה");
      return assessment;
    }
    reasons.push(cpa <= 1500 ? "העלות להרשמה עד 1,500 ש״ח, רמה מצוינת לפי כללי הבקרה שלנו" : cpa <= 3000 ? "העלות להרשמה עד 3,000 ש״ח, עדיין מועמד להגדלה זהירה" : "העלות להרשמה מעל 3,000 ש״ח; נדרשת בדיקת כלכליות לפני העלאה");
    if (!active) return assessment;
    const percent = policyPercent(cpa, registrations);
    if (percent === null) {
      assessment.badge = { label: "סקייל לבדיקת כדאיות", color: "orange" };
      return assessment;
    }
    assessment.status = "candidate";
    assessment.badge = { label: tier === "excellent" ? "מועמד לסקייל" : "מועמד לסקייל זהיר", color: tier === "excellent" ? "green" : "orange" };
    const campaignBudgetKind = budgetKind(sourceCampaign?.budget);
    if (campaignBudgetKind === "invalid") {
      assessment.status = "review";
      assessment.badge = { label: "סקייל לבדיקה", color: "orange" };
      reasons.push("פרטי תקציב הקמפיין אינם תקינים או כוללים גם יומי וגם כולל; יש לבדוק אותם");
      return assessment;
    }
    if (campaignBudgetKind === "lifetime") {
      assessment.budgetMode = "lifetime";
      reasons.push("לקמפיין תקציב לכל התקופה; אין סכום יומי שניתן להציע לו הגדלה אוטומטית בחישוב זה");
      return assessment;
    }
    if (campaignBudgetKind === "daily" && sourceCampaign && positive(sourceCampaign.budget?.daily)) {
      assessment.budgetMode = "campaign_daily";
      if (!sourceCampaign.adSets.some((adSet) => adSet.status === "active" && adSet.ads.some((ad) => ad.status === "active"))) {
        assessment.status = "review";
        assessment.badge = { label: "סקייל לבדיקה, אין מודעות פעילות", color: "orange" };
        reasons.push("אין כרגע סדרת מודעות פעילה עם מודעה פעילה; בוחנים את המסירה לפני הגדלת התקציב");
        return assessment;
      }
      const target = targetFor(sourceCampaign.id, "campaign", sourceCampaign.name, sourceCampaign.budget.daily, percent);
      if (target) {
        assessment.budgetTargets = [target];
        assessment.increasePercent = percent;
        assessment.action = "increase";
        reasons.push(`הצעת הבקרה היא הגדלה של ${percent}% בתקציב הקמפיין היומי הקיים`);
      } else reasons.push("לא ניתן לחשב הגדלה תקינה של התקציב היומי הקיים");
      return assessment;
    }

    const sourceSets = sourceCampaign?.adSets ?? [];
    const hasDailySet = sourceSets.some((adSet) => budgetKind(adSet.budget) === "daily");
    const hasLifetimeSet = sourceSets.some((adSet) => budgetKind(adSet.budget) === "lifetime");
    assessment.budgetMode = hasDailySet ? "adset_daily" : hasLifetimeSet ? "lifetime" : "unknown";
    const rowSetById = new Map(row.adSets.map((adSet) => [adSet.id, adSet]));
    for (const sourceSet of sourceSets) {
      const setRow = rowSetById.get(sourceSet.id);
      if (sourceSet.status !== "active" || !sourceSet.ads.some((ad) => ad.status === "active") || !setRow || setRow.status !== "active" || !setRow.leadsKnown || unknownStatuses(setRow) || !validCounts(setRow)) continue;
      const setRegistrations = registrationsOf(setRow);
      if (setRegistrations < 1 || !positive(setRow.spend) || budgetKind(sourceSet.budget) !== "daily" || !positive(sourceSet.budget?.daily)) continue;
      const setCpa = money(setRow.spend / setRegistrations);
      const setPercent = policyPercent(setCpa, setRegistrations);
      if (setPercent === null) continue;
      const target = targetFor(sourceSet.id, "adset", sourceSet.name, sourceSet.budget.daily, setPercent);
      if (target) assessment.budgetTargets.push(target);
    }
    if (assessment.budgetTargets.length > 0) {
      assessment.action = "increase";
      const percentages = new Set(assessment.budgetTargets.map((target) => target.increasePercent));
      assessment.increasePercent = percentages.size === 1 ? assessment.budgetTargets[0].increasePercent : null;
      reasons.push(`ההצעה מוגבלת ל־${assessment.budgetTargets.length} סדרות פעילות עם הרשמות, עלות מתאימה ותקציב יומי משלהן`);
    } else {
      reasons.push(hasLifetimeSet && !hasDailySet
        ? "לסדרות תקציב לכל התקופה; נדרשת בדיקה ידנית של הסכום והזמן שנותר"
        : hasDailySet ? "אין סדרה פעילה עם מודעה פעילה, הרשמה, עלות עד 3,000 ש״ח ותקציב יומי תקין שניתן להגדיל" : "לא התקבל תקציב יומי קיים; המועמדות נשמרת בלי להמציא סכום להגדלה");
    }
    return assessment;
  });
}
