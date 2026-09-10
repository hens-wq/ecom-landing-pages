import type { PerformanceMetrics, RawMetrics } from "@/lib/types";

/**
 * Divides two numbers, returning `null` instead of NaN/Infinity when the result
 * is not meaningful (zero/undefined denominator). This is the single choke point
 * every derived metric goes through, so "no data" is represented one way
 * everywhere and formatters can safely render `null` as "-".
 */
export function safeDivide(numerator: number, denominator: number): number | null {
  if (!denominator) return null;
  const result = numerator / denominator;
  if (!Number.isFinite(result)) return null;
  return result;
}

export const calcFrequency = (impressions: number, reach: number) => safeDivide(impressions, reach);

export const calcCTR = (linkClicks: number, impressions: number) => {
  const rate = safeDivide(linkClicks, impressions);
  return rate === null ? null : rate * 100;
};

export const calcCPC = (spend: number, linkClicks: number) => safeDivide(spend, linkClicks);

export const calcCPM = (spend: number, impressions: number) => {
  const cost = safeDivide(spend, impressions);
  return cost === null ? null : cost * 1000;
};

export const calcCPL = (spend: number, leads: number) => safeDivide(spend, leads);

export const calcCloseRate = (sales: number, leads: number) => {
  const rate = safeDivide(sales, leads);
  return rate === null ? null : rate * 100;
};

export const calcCostPerSale = (spend: number, sales: number) => safeDivide(spend, sales);

export const calcROAS = (revenue: number, spend: number) => safeDivide(revenue, spend);

/** Expands a RawMetrics bag into every derived KPI, handling zero/undefined denominators safely. */
export function computeMetrics(raw: RawMetrics): PerformanceMetrics {
  return {
    ...raw,
    frequency: calcFrequency(raw.impressions, raw.reach),
    ctr: calcCTR(raw.linkClicks, raw.impressions),
    cpc: calcCPC(raw.spend, raw.linkClicks),
    cpm: calcCPM(raw.spend, raw.impressions),
    cpl: calcCPL(raw.spend, raw.leads),
    closeRate: calcCloseRate(raw.sales, raw.leads),
    costPerSale: calcCostPerSale(raw.spend, raw.sales),
    roas: calcROAS(raw.revenue, raw.spend),
  };
}

/** Scales a raw metrics bag by a factor (used to simulate different date-range presets in Phase 1). */
export function scaleRawMetrics(raw: RawMetrics, scale: number): RawMetrics {
  return {
    spend: raw.spend * scale,
    impressions: Math.round(raw.impressions * scale),
    reach: Math.round(raw.reach * scale),
    linkClicks: Math.round(raw.linkClicks * scale),
    leads: Math.round(raw.leads * scale),
    sales: Math.round(raw.sales * scale),
    revenue: raw.revenue * scale,
  };
}

export function sumRawMetrics(items: RawMetrics[]): RawMetrics {
  return items.reduce<RawMetrics>(
    (acc, item) => ({
      spend: acc.spend + item.spend,
      impressions: acc.impressions + item.impressions,
      reach: acc.reach + item.reach,
      linkClicks: acc.linkClicks + item.linkClicks,
      leads: acc.leads + item.leads,
      sales: acc.sales + item.sales,
      revenue: acc.revenue + item.revenue,
    }),
    { spend: 0, impressions: 0, reach: 0, linkClicks: 0, leads: 0, sales: 0, revenue: 0 }
  );
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Days between a lead entering the system and the matched sale, using full calendar-day
 * precision (a sale minutes after the lead is day 0 - "one shot").
 */
export function calcTimeToSaleDays(leadDateIso: string, saleDateIso: string): number | null {
  const leadDate = new Date(leadDateIso);
  const saleDate = new Date(saleDateIso);
  if (Number.isNaN(leadDate.getTime()) || Number.isNaN(saleDate.getTime())) return null;

  const leadDay = Date.UTC(leadDate.getUTCFullYear(), leadDate.getUTCMonth(), leadDate.getUTCDate());
  const saleDay = Date.UTC(saleDate.getUTCFullYear(), saleDate.getUTCMonth(), saleDate.getUTCDate());
  return Math.round((saleDay - leadDay) / MS_PER_DAY);
}

export function timeToSaleBucket(days: number | null) {
  if (days === null) return null;
  if (days <= 0) return "one_shot" as const;
  if (days <= 3) return "1_3_days" as const;
  if (days <= 7) return "4_7_days" as const;
  return "8_plus_days" as const;
}

export const TIME_TO_SALE_BUCKET_LABELS: Record<string, string> = {
  one_shot: "סגירה מיידית (One Shot)",
  "1_3_days": "1-3 ימים",
  "4_7_days": "4-7 ימים",
  "8_plus_days": "8+ ימים",
};
