import { safeDivide } from "@/lib/calculations";
import type { LeadStatusRecord } from "@/lib/lead-status/types";

/**
 * The amount that actually counts as revenue for this lead, given its
 * CURRENT secondary status - never both fields at once, even though the
 * record may still be storing a stale value in whichever field isn't active
 * right now (see LeadStatusRecord's doc comment). Returns null for anything
 * that isn't a sale at all.
 */
export function activePaymentAmount(record: LeadStatusRecord): number | null {
  if (record.mainStatus !== "נרשם") return null;
  if (record.secondaryStatus === "תשלום מלא") return record.fullPaymentAmount;
  if (record.secondaryStatus === "תשלום חלקי") return record.partialPaymentAmount;
  return null;
}

/** A sale is any lead registered ("נרשם") with either payment type - both count as exactly one sale each, regardless of amount. */
export function isSaleRecord(record: LeadStatusRecord): boolean {
  return record.mainStatus === "נרשם" && (record.secondaryStatus === "תשלום מלא" || record.secondaryStatus === "תשלום חלקי");
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

export interface SalesSummary {
  totalLeads: number;
  totalSales: number;
  /** Percent (0-100), or null if there are no leads at all. */
  conversionRate: number | null;
  /** Meta Spend / Total Sales, or null if there are no sales (display "-"). */
  costPerAcquisition: number | null;
  /** Sum of every counted (active) payment amount. */
  recordedRevenue: number;
  /** Recorded Revenue / Meta Spend, or null if spend is 0. */
  roas: number | null;
}

/**
 * `statusesByLeadId` covers leads with no manual record yet as "חדש"/"חדש" by
 * omission (see defaultLeadStatusRecord) - callers pass whatever the
 * repository actually has, never needing to pre-fill missing entries.
 */
export function calculateSalesSummary(
  leadIds: string[],
  statusesByLeadId: Map<string, LeadStatusRecord>,
  totalSpend: number
): SalesSummary {
  let totalSales = 0;
  let recordedRevenue = 0;

  for (const leadId of leadIds) {
    const record = statusesByLeadId.get(leadId);
    if (!record) continue;
    if (isSaleRecord(record)) {
      totalSales += 1;
      recordedRevenue += activePaymentAmount(record) ?? 0;
    }
  }

  const totalLeads = leadIds.length;
  const conversionRateRatio = safeDivide(totalSales, totalLeads);

  return {
    totalLeads,
    totalSales,
    conversionRate: conversionRateRatio === null ? null : conversionRateRatio * 100,
    costPerAcquisition: safeDivide(totalSpend, totalSales),
    recordedRevenue,
    roas: safeDivide(recordedRevenue, totalSpend),
  };
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
