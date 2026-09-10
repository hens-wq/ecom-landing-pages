import type { PerformanceMetrics, RawMetrics, TimeToSaleBucket } from "@/lib/types";

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

/**
 * Exact elapsed time between a lead entering the system and the matched sale, to
 * the minute. This is the precise value everything else (days, hour/minute
 * display, the One Shot bucket) derives from - a sale 20 minutes after midnight
 * the day after the lead is ~20 minutes, not "1 day".
 */
export function calcTimeToSaleMinutes(leadDateIso: string, saleDateIso: string): number | null {
  const leadTime = new Date(leadDateIso).getTime();
  const saleTime = new Date(saleDateIso).getTime();
  if (Number.isNaN(leadTime) || Number.isNaN(saleTime)) return null;
  return Math.round((saleTime - leadTime) / (1000 * 60));
}

/** Whole days elapsed (floor), derived from the exact minute count. Negative input (bad data) clamps to null. */
export function timeToSaleDaysFromMinutes(minutes: number | null): number | null {
  if (minutes === null || minutes < 0) return null;
  return Math.floor(minutes / (60 * 24));
}

/** Convenience wrapper kept for callers that only have the two ISO timestamps on hand. */
export function calcTimeToSaleDays(leadDateIso: string, saleDateIso: string): number | null {
  return timeToSaleDaysFromMinutes(calcTimeToSaleMinutes(leadDateIso, saleDateIso));
}

/**
 * Bucket thresholds are configurable hour cutoffs rather than hardcoded "same
 * calendar day" logic, specifically so "One Shot" can later be redefined (e.g. to
 * "within 3 hours") by editing this array - nothing that calls `timeToSaleBucket`
 * needs to change.
 */
export interface TimeToSaleBucketDef {
  id: TimeToSaleBucket;
  label: string;
  /** Upper bound in hours (inclusive). The last entry should be Infinity. */
  maxHours: number;
}

/**
 * ⚠️ PLACEHOLDER BUSINESS RULE - NOT FINAL. ⚠️
 *
 * Ecom has not yet decided where the real "One Shot" vs. "needs follow-up" line
 * sits - that decision should be made later, after reviewing actual sales data
 * (Phase 2+), not baked in now. 24 hours is a reasonable-looking Phase 1 default
 * so the mock data has *something* to bucket by, nothing more. Do not treat it,
 * or the other cutoffs below, as agreed product behavior.
 *
 * When the real definition is decided, change this one number (or restructure
 * TIME_TO_SALE_BUCKET_DEFS entirely) - every UI column that shows a bucket reads
 * from that table, so nothing else needs to change. Either way, the exact elapsed
 * time (`timeToSaleMinutes` / `timeToSaleDays`) is always computed and displayed
 * regardless of these buckets (see calcTimeToSaleMinutes above), so no precision
 * is ever hidden behind a bucket label.
 */
const ONE_SHOT_MAX_HOURS_PLACEHOLDER = 24;

export const TIME_TO_SALE_BUCKET_DEFS: TimeToSaleBucketDef[] = [
  { id: "one_shot", label: "סגירה מיידית (One Shot)", maxHours: ONE_SHOT_MAX_HOURS_PLACEHOLDER },
  { id: "1_3_days", label: "1-3 ימים", maxHours: 72 },
  { id: "4_7_days", label: "4-7 ימים", maxHours: 168 },
  { id: "8_plus_days", label: "8+ ימים", maxHours: Infinity },
];

export function timeToSaleBucket(minutes: number | null): TimeToSaleBucket | null {
  if (minutes === null || minutes < 0) return null;
  const hours = minutes / 60;
  const bucket = TIME_TO_SALE_BUCKET_DEFS.find((def) => hours <= def.maxHours);
  return (bucket ?? TIME_TO_SALE_BUCKET_DEFS[TIME_TO_SALE_BUCKET_DEFS.length - 1]).id;
}
