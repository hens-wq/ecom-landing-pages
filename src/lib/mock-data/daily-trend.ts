import { campaigns } from "@/lib/mock-data/campaigns";
import { sumRawMetrics } from "@/lib/calculations";

export interface DailyTrendPoint {
  date: string; // ISO date (day precision)
  spend: number;
  revenue: number;
  leads: number;
  sales: number;
}

/**
 * Relative daily activity for the trailing 30 days, tiled from a weekly shape
 * (Sunday-Thursday busier, Friday-Saturday quieter - the Israeli work week).
 * Fixed values (not random) so the chart is identical on server and client.
 */
const WEEKLY_SHAPE = [1.05, 1.3, 1.25, 1.15, 1.1, 0.5, 0.35]; // Sun..Sat
const TREND_DAYS = 30;
const TODAY = new Date("2026-09-10T00:00:00Z");

function buildDailyWeights(days: number): number[] {
  const weights: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(TODAY);
    date.setUTCDate(date.getUTCDate() - i);
    weights.push(WEEKLY_SHAPE[date.getUTCDay()]);
  }
  return weights;
}

function distribute(total: number, weights: number[], weightSum: number, round: boolean): number[] {
  return weights.map((w) => {
    const value = (total * w) / weightSum;
    return round ? Math.round(value) : Math.round(value * 100) / 100;
  });
}

const allAdsRawMetrics = campaigns.flatMap((c) => c.adSets.flatMap((as) => as.ads.map((ad) => ad.metrics)));
const thirtyDayTotals = sumRawMetrics(allAdsRawMetrics);

const weights = buildDailyWeights(TREND_DAYS);
const weightSum = weights.reduce((a, b) => a + b, 0);

const spendSeries = distribute(thirtyDayTotals.spend, weights, weightSum, false);
const revenueSeries = distribute(thirtyDayTotals.revenue, weights, weightSum, false);
const leadsSeries = distribute(thirtyDayTotals.leads, weights, weightSum, true);
const salesSeries = distribute(thirtyDayTotals.sales, weights, weightSum, true);

export const dailyTrend: DailyTrendPoint[] = weights.map((_, i) => {
  const date = new Date(TODAY);
  date.setUTCDate(date.getUTCDate() - (TREND_DAYS - 1 - i));
  return {
    date: date.toISOString(),
    spend: spendSeries[i],
    revenue: revenueSeries[i],
    leads: leadsSeries[i],
    sales: salesSeries[i],
  };
});
