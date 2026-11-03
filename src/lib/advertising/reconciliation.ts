import { formatCurrency } from "@/lib/format";
import type { ReconciliationStatus, SpendReconciliation } from "@/lib/advertising/types";
import type { Campaign, RawMetrics } from "@/lib/types";

/**
 * Pure spend checks, kept apart from the server-only data layer so they can be unit tested. A difference up to this many
 * shekels is rounding, not a gap.
 */
export const RECONCILIATION_TOLERANCE_ILS = 1;

/** Spend of every listed course ad, plus the unlisted course delivery. This is exactly what the dashboard totals add up. */
export function summedSpend(campaigns: Campaign[], unlisted: RawMetrics | null): number {
  let total = unlisted?.spend ?? 0;
  for (const campaign of campaigns) {
    for (const adSet of campaign.adSets) {
      for (const ad of adSet.ads) total += ad.metrics.spend;
    }
  }
  return total;
}

export type AccountSpendResult = { ok: true; spend: number } | { ok: false; message: string };

/**
 * Compares what the app sums with Meta's own account total for the same range. The account total includes excluded
 * (non-course) campaigns, so their spend is removed first. Both sides must cover the same campaigns.
 */
export function buildSpendReconciliation(input: {
  campaigns: Campaign[];
  unlisted: RawMetrics | null;
  excludedSpend: number;
  accountSpend: AccountSpendResult;
}): SpendReconciliation {
  const summed = summedSpend(input.campaigns, input.unlisted);

  if (!input.accountSpend.ok) {
    return {
      status: "unavailable",
      accountSpend: null,
      summedSpend: summed,
      excludedSpend: input.excludedSpend,
      difference: null,
      message: `לא ניתן לאמת את ההוצאה מול חשבון Meta כרגע: ${input.accountSpend.message}`,
    };
  }

  const account = input.accountSpend.spend;
  const expectedCourseSpend = account - input.excludedSpend;
  const difference = expectedCourseSpend - summed;
  const status: ReconciliationStatus = Math.abs(difference) <= RECONCILIATION_TOLERANCE_ILS ? "ok" : "gap";
  const excludedNote = input.excludedSpend > 0 ? ` בניכוי ${formatCurrency(input.excludedSpend)} של קמפיינים שאינם קמפייני לימודים` : "";
  const message =
    status === "ok"
      ? `ההוצאה המסוכמת (${formatCurrency(summed)}) תואמת את סך ההוצאה בחשבון Meta לטווח${excludedNote}.`
      : `פער של ${formatCurrency(Math.abs(difference))} בין ההוצאה המסוכמת (${formatCurrency(summed)}) לבין סך ההוצאה בחשבון Meta לטווח${excludedNote} (${formatCurrency(expectedCourseSpend)}). הסכומים עשויים להיות חלקיים.`;

  return {
    status,
    accountSpend: account,
    summedSpend: summed,
    excludedSpend: input.excludedSpend,
    difference,
    message,
  };
}
