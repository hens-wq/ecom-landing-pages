/**
 * Every threshold the optimization center uses, in one place. The numbers come from the Stage 2 spec. Where the spec
 * left a value open, the value chosen here is marked "הנחה" and is listed in the report. Changing any number here must
 * come with a new OPTIMIZATION_RULE_VERSION, so a saved report always says which rules produced it.
 */
export const OPTIMIZATION_RULE_VERSION = "stage2-v3";

/** The spec's weekly analysis window. Frequency and "3+ registrations" are judged only on a selection of exactly this many days. */
export const WEEKLY_ANALYSIS_DAYS = 7;

/** Most days a single run may cover. Longer ranges would make the Meta and lead reads too heavy for one request. */
export const MAX_RUN_RANGE_DAYS = 366;

// ---- Leads, sales and cost per registration (₪) ----

/** CPA below this is a positive signal. */
export const CPA_POSITIVE_BELOW = 2000;
/** CPA above this is a high-cost signal. Between the two bounds the result is KEEP. */
export const CPA_HIGH_FROM = 3000;
/** Registrations needed, within a 7-day selection, to suggest a scale candidate (with CPA below CPA_POSITIVE_BELOW). */
export const SCALE_MIN_REGISTRATIONS = 3;
/** Two registrations: "STRONG KEEP / CHECK SCALE". One registration: positive, but a small sample. */
export const STRONG_KEEP_REGISTRATIONS = 2;

/** Zero leads with spend above this (₪) is a zero-leads case, but only when both sources confirm zero. */
export const ZERO_LEADS_MIN_SPEND = 160;

// ---- Sample sizes ----

/** Classified leads (Green + Red) below this: quality is "insufficient" (gray), no verdict. */
export const CLASSIFIED_INSUFFICIENT_BELOW = 5;
/** Classified leads from this count up: a meaningful sample. Between the two bounds: low confidence, caution. */
export const CLASSIFIED_MEANINGFUL_FROM = 10;
/**
 * Leads needed before a CPL verdict can justify PAUSE CANDIDATE, and before a CPL or CPA trend counts as a sample.
 * הנחה: the spec gives no number for this; 10 matches the classification bound.
 */
export const LEADS_MEANINGFUL_FROM = 10;

// ---- Red / Green rates (percent of classified leads; pending and unmapped are excluded from the base) ----

export const RED_RATE_OK_MAX = 20;
export const RED_RATE_WATCH_MAX = 35;
export const RED_RATE_WARNING_MAX = 50;

// ---- Frequency (judged only on a 7-day selection, for a new audience) ----

export const FREQUENCY_OK_MAX = 2.5;
export const FREQUENCY_WATCH_MAX = 3.5;
export const FREQUENCY_WARNING_MAX = 4.5;
/** Creative-fatigue check: frequency strictly above this, together with a CTR or CPL drop. */
export const FREQUENCY_FATIGUE_ABOVE = 3.5;

// ---- Trend samples (both periods must pass) ----

/** CTR and CPM trends need at least this many impressions in each period. */
export const TREND_MIN_IMPRESSIONS = 2000;
/** CPC trends need at least this many link clicks in each period. */
export const TREND_MIN_LINK_CLICKS = 30;

// ---- Trend thresholds (relative change against the previous period, percent) ----

export const CTR_DROP_WARNING = 25;
export const CTR_DROP_STRONG = 40;
export const CPC_RISE_WARNING = 25;
export const CPC_RISE_STRONG = 50;
export const CPM_RISE_WARNING = 25;
export const CPM_RISE_STRONG = 50;
/** Creative-fatigue check: CPL rise that counts alongside a high frequency. */
export const CPL_RISE_FATIGUE = 25;
/** Reach drop that starts a WATCH, when spend stayed within the band below. */
export const REACH_DROP_WATCH = 30;
export const REACH_DROP_WARNING = 50;
/** Spend must have stayed within ± this percent for a reach drop to count as a delivery change, not a budget change. */
export const SPEND_STABLE_BAND = 20;

// ---- Budget concentration (daily spend, complete days only) ----

/** One ad at or above this share of its campaign's daily spend counts as dominant on that day. */
export const CONCENTRATION_SHARE_MIN = 70;
/** The dominant ad must stay dominant on at least this many consecutive complete days. */
export const CONCENTRATION_MIN_DAYS = 3;
/** Other ads each below this share of the window spend are marked "Insufficient Delivery – Cannot Evaluate Fairly". */
export const OTHER_AD_SHARE_MAX = 10;
