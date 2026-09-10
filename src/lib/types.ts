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

/**
 * How the lead was captured. Used both as the Ad's destination (what the ad sends
 * traffic to) and the Lead's own source - the two are always the same value for a
 * given lead, since the lead's source *is* whatever its ad was configured to use.
 * Standard and Rich Meta forms are kept distinct (not grouped under one generic
 * "meta_form" value) because lead quality and close rate differ meaningfully
 * between them.
 */
export type LeadSourceType = "meta_standard_form" | "meta_rich_form" | "landing_page";

/**
 * Coarse bucket for how long it took a lead to become a sale. The thresholds that
 * define each bucket - including what counts as "One Shot" - live in
 * `TIME_TO_SALE_BUCKET_DEFS` (lib/calculations.ts) as configurable hour cutoffs.
 *
 * IMPORTANT: those thresholds (24h for One Shot in particular) are a Phase 1
 * placeholder, not a confirmed business rule - see the comment on
 * `TIME_TO_SALE_BUCKET_DEFS` before treating this bucket as authoritative. The
 * exact duration (`timeToSaleMinutes` / `timeToSaleDays`) is always available
 * independent of whatever the current bucket cutoffs are.
 */
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
  destinationType: LeadSourceType;
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
 *
 * The same phone number can submit multiple leads over time (e.g. one lead per
 * campaign they clicked into) - every one of them is kept as its own record,
 * never deduplicated or overwritten. `normalizedPhone` is the primary key used to
 * find *candidate* leads for a sale; which candidate actually gets credit for the
 * sale is decided by the attribution rule in lib/matching.ts (currently: the most
 * recent lead dated at or before the sale), not by this record in isolation.
 */
export interface Lead {
  id: string;
  name: string;
  phone: string;
  normalizedPhone: string;
  leadDate: string; // full ISO datetime (date + time)

  campaignId: string;
  campaignName: string;
  adSetId: string;
  adSetName: string;
  adId: string;
  adName: string;

  sourceType: LeadSourceType;

  // Future tracking fields (Meta Pixel / Conversions API, Phase 2) - captured in the
  // shape now so the matching engine never has to be re-architected to add them.
  fbclid?: string;
  fbc?: string;
  fbp?: string;

  /**
   * Sale outcome for THIS specific lead record. In Phase 1 mock data this is
   * derived from the matching engine (see mock-data/leads-with-outcomes.ts), not
   * hand-authored, so it can never disagree with what the Sales & Matching page
   * shows: a lead is "sold" only if it's the lead a SalesMatch actually attributed
   * a sale to.
   */
  saleStatus: "sold" | "not_sold";
  saleDate?: string; // full ISO datetime
  saleAmount?: number;
  /** Exact minutes between leadDate and saleDate. The precise value hours/days derive from. */
  timeToSaleMinutes?: number | null;
  /** Whole days elapsed (floor of timeToSaleMinutes / 1440) - kept for simple display/sorting. */
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

/**
 * The result of matching one incoming Sale to a Lead by (normalized) phone number.
 * Phone is the sole basis for candidacy; customer name is never required to agree
 * and is shown only as supporting context. When a phone number has multiple
 * leads on file, `lead` is whichever one the attribution rule in lib/matching.ts
 * picked (currently: the most recent lead at or before the sale date) - see that
 * file for the exact rule and how to change it.
 */
export interface SalesMatch {
  id: string;
  sale: Sale;
  lead: Lead | null;
  matchStatus: MatchStatus;
  /**
   * Informational only (see lib/name-match.ts) - true when the sale's customer
   * name looks like a different person than the attributed lead's name. Never
   * affects `matchStatus`: phone is still the sole basis for the match, this is
   * just a flag for a human to sanity-check (invoice under a spouse/household
   * name, a nickname, etc). Always false when there is no lead.
   */
  nameMismatch: boolean;

  leadDate: string | null;
  sourceType: LeadSourceType | null;
  /** Only populated for matchStatus "matched" - a lead dated after the sale has no meaningful time-to-sale. */
  timeToSaleMinutes: number | null;
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
