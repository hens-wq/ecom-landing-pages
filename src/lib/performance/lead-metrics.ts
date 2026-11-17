import { calcCloseRate, calcCPL, calcCostPerSale } from "@/lib/calculations";
import { ENROLLED_MAIN_STATUS } from "@/lib/lead-status/types";
import { classifyLeadQuality } from "@/lib/performance/lead-quality";
import type { LeadFact } from "@/lib/performance/types";

/** A sale is any enrolled lead (Main Status "נרשם"), whatever its secondary status or payment state. */
export function isSaleStatus(mainStatus: string | null): boolean {
  return mainStatus === ENROLLED_MAIN_STATUS;
}

/**
 * The payment that counts as revenue for a sale, given its CURRENT secondary status.
 * Only one of the two payment fields is ever counted. A missing amount stays null -
 * no value is invented for it.
 */
export function activeAmount(
  mainStatus: string | null,
  secondaryStatus: string | null,
  fullPaymentAmount: number | null,
  partialPaymentAmount: number | null
): number | null {
  if (!isSaleStatus(mainStatus)) return null;
  if (secondaryStatus === "תשלום מלא") return fullPaymentAmount;
  if (secondaryStatus === "תשלום חלקי") return partialPaymentAmount;
  return null;
}

/** Totals for one set of leads: a dashboard row, or the Leads page scope. */
export interface LeadBucket {
  leads: number;
  sales: number;
  revenue: number;
  /** Leads that are counted here but whose status could not be loaded. */
  unknownStatusLeads: number;
}

export function createBucket(): LeadBucket {
  return { leads: 0, sales: 0, revenue: 0, unknownStatusLeads: 0 };
}

export function addLeadToBucket(bucket: LeadBucket, lead: LeadFact): void {
  bucket.leads += 1;
  if (!lead.statusKnown) {
    bucket.unknownStatusLeads += 1;
    return;
  }
  if (isSaleStatus(lead.mainStatus)) {
    bucket.sales += 1;
    bucket.revenue += activeAmount(lead.mainStatus, lead.secondaryStatus, lead.fullPaymentAmount, lead.partialPaymentAmount) ?? 0;
  }
}

export interface LeadQualityCounts {
  green: number;
  pending: number;
  red: number;
  unmapped: number;
}

export interface LeadKpis {
  leads: number;
  sales: number;
  revenue: number;
  /** Percent (0-100). Null when there are no leads. */
  closeRate: number | null;
  /** Spend per registration (עלות להרשמה). Null without spend or without sales. */
  costPerRegistration: number | null;
  /** Spend per lead. Null unless the spend covers exactly the same leads. */
  cpl: number | null;
  /** Spend per green lead. Null unless the spend covers exactly the same leads, or when there are no green leads. */
  qualifiedCpl: number | null;
  quality: LeadQualityCounts;
  unknownStatusLeads: number;
}

/**
 * The one set of lead KPIs both pages use. `spend` is the spend for the same
 * date range and campaign scope as `leads`. When the two don't cover the same
 * leads (for example, a filter on the lead source that spend can't be split by),
 * pass `spendMatchesLeads: false` and the cost figures stay null instead of
 * dividing unrelated numbers.
 */
export function computeLeadKpis(leads: LeadFact[], spend: number | null, options: { spendMatchesLeads: boolean }): LeadKpis {
  const bucket = createBucket();
  const quality: LeadQualityCounts = { green: 0, pending: 0, red: 0, unmapped: 0 };
  for (const lead of leads) {
    addLeadToBucket(bucket, lead);
    if (lead.statusKnown) quality[classifyLeadQuality(lead.secondaryStatus)] += 1;
  }

  const leadCount = bucket.leads;
  const costBasis = spend !== null && options.spendMatchesLeads ? spend : null;
  return {
    leads: leadCount,
    sales: bucket.sales,
    revenue: bucket.revenue,
    closeRate: calcCloseRate(bucket.sales, leadCount),
    costPerRegistration: costBasis === null ? null : calcCostPerSale(costBasis, bucket.sales),
    cpl: costBasis === null ? null : calcCPL(costBasis, leadCount),
    qualifiedCpl: costBasis === null ? null : calcCPL(costBasis, quality.green),
    quality,
    unknownStatusLeads: bucket.unknownStatusLeads,
  };
}
