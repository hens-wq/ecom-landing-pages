import { campaigns as mockCampaigns } from "@/lib/mock-data/campaigns";

const BASELINE_DAYS = 30;

const baselineTotals = mockCampaigns
  .flatMap((campaign) => campaign.adSets.flatMap((adSet) => adSet.ads))
  .reduce(
    (totals, ad) => ({
      sales: totals.sales + ad.metrics.sales,
      revenue: totals.revenue + ad.metrics.revenue,
    }),
    { sales: 0, revenue: 0 }
  );

/**
 * Sales-side totals (Sales, Revenue) never come from Meta and don't come from
 * whichever advertising provider is active either - they come from this
 * internal/local layer, completely independent of it. This is the literal
 * "separate META performance data from INTERNAL sales data" boundary: even
 * once Meta is live and supplying real spend/impressions/leads, these two
 * numbers stay pinned to the same mock baseline Phase 1 always showed, because
 * there is no real attribution yet between a live Meta ad ID and an actual
 * sale (that's Google Sheets / DB work for a later phase).
 *
 * `scale` should be the SAME day-count factor the mock advertising provider
 * uses for the selected date range (dateRangeDayCount(range) / 30) - applying
 * it here too keeps Sales proportional to whatever period is selected instead
 * of a fixed 30-day number sitting next to a 1-day (or 90-day) ad-performance
 * total. Without this, Close Rate / ROAS at the top-level KPI cards would
 * swing to nonsensical values (e.g. a >100% close rate) whenever the selected
 * range is much shorter than the internal baseline.
 *
 * The dashboard combines the scaled result with the ACTIVE provider's
 * spend/leads to get Close Rate / Cost per Sale / ROAS (see app/page.tsx) - a
 * deliberate, documented cross-source join at the top-level KPI cards only.
 * Per-row Sales/Revenue in the Campaign -> Ad Set -> Ad table are NOT joined
 * this way: a real Meta-sourced ad row has no sales data at all (0/"-"), which
 * is the honest answer until real attribution exists.
 */
export function getInternalSalesTotals(scale: number): { sales: number; revenue: number } {
  return {
    sales: Math.round(baselineTotals.sales * scale),
    revenue: Math.round(baselineTotals.revenue * scale),
  };
}

/** The 30-day span the mock advertising baseline (and this internal sales baseline) is authored around. */
export const INTERNAL_SALES_BASELINE_DAYS = BASELINE_DAYS;
