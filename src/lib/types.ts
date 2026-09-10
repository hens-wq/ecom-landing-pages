/**
 * Core data model for the Ecom marketing performance dashboard.
 *
 * Phase 1: everything here is populated from mock data (see src/lib/mock-data).
 * The shapes are designed so that Phase 2 can swap the data source (Meta Ads API,
 * a real database, Google Sheets) without changing any UI component - components
 * only ever consume these types, never the mock data generators directly... except
 * at the top-level data-loading boundary (src/lib/mock-data/index.ts).
 */

export type EntityStatus = "active" | "paused" | "ended";

/** How the ad ultimately captures a lead. More types can be added later. */
export type DestinationType = "standard_form" | "rich_form" | "landing_page";

export type SourceType = "meta_form" | "landing_page";

/** Coarse bucket for how long it took a lead to become a sale. Phase 2 will use this for cohort analysis. */
export type TimeToSaleBucket = "one_shot" | "1_3_days" | "4_7_days" | "8_plus_days";

export type MatchStatus = "matched" | "unmatched" | "needs_review";

/**
 * Raw, additive metrics as they would come back from an ads platform / DB.
 * Every other performance number is *derived* from these (see lib/calculations.ts) -
 * nothing here is pre-computed, so aggregating Ads -> AdSets -> Campaigns is a
 * straight sum and never drifts out of sync with the derived metrics.
 */
export interface RawMetrics {
  spend: number;
  impressions: number;
  reach: number;
  linkClicks: number;
  leads: number;
  sales: number;
  revenue: number;
}

/** RawMetrics plus every calculated KPI, with `null` standing in for "not available" (never NaN/Infinity). */
export interface PerformanceMetrics extends RawMetrics {
  frequency: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  cpl: number | null;
  closeRate: number | null;
  costPerSale: number | null;
  roas: number | null;
}

export interface Ad {
  id: string;
  name: string;
  adSetId: string;
  status: EntityStatus;
  destinationType: DestinationType;
  metrics: RawMetrics;
}

export interface AdSet {
  id: string;
  name: string;
  campaignId: string;
  status: EntityStatus;
  ads: Ad[];
}

export interface Campaign {
  id: string;
  name: string;
  objective: string;
  status: EntityStatus;
  adSets: AdSet[];
}

/**
 * A lead as captured at the moment of entry. Attribution is carried by ID first
 * (campaignId/adSetId/adId) - names are convenience/display fields only and must
 * never be relied on for matching, since campaign/ad names can be renamed or reused.
 */
export interface Lead {
  id: string;
  name: string;
  phone: string;
  normalizedPhone: string;
  leadDate: string; // ISO datetime

  campaignId: string;
  campaignName: string;
  adSetId: string;
  adSetName: string;
  adId: string;
  adName: string;

  sourceType: SourceType;

  // Future tracking fields (Meta Pixel / Conversions API, Phase 2) - captured in the
  // shape now so the matching engine never has to be re-architected to add them.
  fbclid?: string;
  fbc?: string;
  fbp?: string;

  saleStatus: "sold" | "not_sold";
  saleDate?: string; // ISO datetime
  saleAmount?: number;
  /** Sale date - lead date, in days. Same calendar day (or same session) => 0. */
  timeToSaleDays?: number | null;
  timeToSaleBucket?: TimeToSaleBucket | null;
}

/** A single row as it will arrive from the future "Sales" Google Sheet. */
export interface Sale {
  id: string;
  customerName: string;
  phone: string;
  normalizedPhone: string;
  saleDate: string; // ISO datetime
  saleAmount: number;
}

/** The result of matching one incoming Sale to a Lead by (normalized) phone number. */
export interface SalesMatch {
  id: string;
  sale: Sale;
  lead: Lead | null;
  matchStatus: MatchStatus;

  leadDate: string | null;
  timeToSaleDays: number | null;
  timeToSaleBucket: TimeToSaleBucket | null;

  campaignId: string | null;
  campaignName: string | null;
  adSetId: string | null;
  adSetName: string | null;
  adId: string | null;
  adName: string | null;
}

export interface DateRangePreset {
  id: string;
  label: string;
  /** Multiplier applied to the 30-day baseline mock dataset, purely for Phase 1 UI interactivity. */
  scale: number;
}
