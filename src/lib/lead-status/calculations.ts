import { safeDivide } from "@/lib/calculations";
import { ENROLLED_MAIN_STATUS, type LeadStatusRecord } from "@/lib/lead-status/types";
import { isPositiveAmount } from "@/lib/lead-status/validation";
import { activeAmount } from "@/lib/performance/lead-metrics";

/**
 * The amount that actually counts as revenue for this lead, given its
 * CURRENT secondary status - never both fields at once, even though the
 * record may still be storing a stale value in whichever field isn't active
 * right now (see LeadStatusRecord's doc comment). Returns null for anything
 * that isn't a sale at all.
 */
export function activePaymentAmount(record: LeadStatusRecord): number | null {
  return activeAmount(record.mainStatus, record.secondaryStatus, record.fullPaymentAmount, record.partialPaymentAmount);
}

/** A sale is any enrolled lead (Main Status "נרשם"), whether or not a payment amount has been entered yet - revenue still only counts entered amounts (see activePaymentAmount). */
export function isSaleRecord(record: LeadStatusRecord): boolean {
  return record.mainStatus === ENROLLED_MAIN_STATUS;
}

/** An enrolled lead with no payment amount entered - the state the Leads page flags for follow-up. */
export function isEnrolledMissingPayment(record: LeadStatusRecord): boolean {
  return record.mainStatus === ENROLLED_MAIN_STATUS && !isPositiveAmount(record.fullPaymentAmount) && !isPositiveAmount(record.partialPaymentAmount);
}

/**
 * A lead counts as "irrelevant" only under the four exact conditions from the
 * spec - every OTHER secondary status under "לא מעוניין" (price objection,
 * chose a degree instead, a competitor, future potential, etc.) is a real,
 * still-valuable-to-analyze lead and must never be folded into this rate.
 */
export function isIrrelevantRecord(record: LeadStatusRecord): boolean {
  if (record.mainStatus === "ליד שגוי") return true;
  if (record.mainStatus === "רשימה שחורה") return true;
  if (record.mainStatus === "DATA") return true;
  if (record.mainStatus === "לא מעוניין" && record.secondaryStatus === 'ל"מ - אין שיתוף פעולה') return true;
  return false;
}

export interface IrrelevantRateResult {
  totalLeads: number;
  irrelevantLeads: number;
  /** Percent (0-100), or null if there are no leads at all. */
  rate: number | null;
}

/** Optional `groupBy` prepares this for a future per-Campaign/AdSet/Ad breakdown view (not built yet - see leads page) without changing this function's signature later. */
export function calculateIrrelevantRate(
  leadIds: string[],
  statusesByLeadId: Map<string, LeadStatusRecord>,
  groupBy?: (leadId: string) => string
): IrrelevantRateResult & { byGroup: Map<string, IrrelevantRateResult> } {
  let irrelevantLeads = 0;
  const byGroup = new Map<string, { total: number; irrelevant: number }>();

  for (const leadId of leadIds) {
    const record = statusesByLeadId.get(leadId);
    const irrelevant = Boolean(record && isIrrelevantRecord(record));
    if (irrelevant) irrelevantLeads += 1;

    if (groupBy) {
      const key = groupBy(leadId);
      const bucket = byGroup.get(key) ?? { total: 0, irrelevant: 0 };
      bucket.total += 1;
      if (irrelevant) bucket.irrelevant += 1;
      byGroup.set(key, bucket);
    }
  }

  const totalLeads = leadIds.length;
  const rateRatio = safeDivide(irrelevantLeads, totalLeads);

  const byGroupResult = new Map<string, IrrelevantRateResult>();
  for (const [key, bucket] of byGroup) {
    const groupRatio = safeDivide(bucket.irrelevant, bucket.total);
    byGroupResult.set(key, {
      totalLeads: bucket.total,
      irrelevantLeads: bucket.irrelevant,
      rate: groupRatio === null ? null : groupRatio * 100,
    });
  }

  return {
    totalLeads,
    irrelevantLeads,
    rate: rateRatio === null ? null : rateRatio * 100,
    byGroup: byGroupResult,
  };
}
