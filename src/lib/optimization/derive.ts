import { calcCPC, calcCPM, calcCPL, calcCTR, calcCloseRate, calcCostPerSale, calcFrequency, safeDivide } from "@/lib/calculations";

/**
 * The raw figures of one entity (campaign, ad set or ad) for one window. Delivery figures come from Meta, lead figures
 * from the same attribution the dashboard uses. A lead figure is meaningful only when leadsKnown is true.
 */
export interface WindowFigures {
  /** Meta lead forms and landing-page leads were both loaded in full for this window. False: lead figures are unknown. */
  leadsKnown: boolean;
  spend: number;
  impressions: number;
  linkClicks: number;
  /** Unique reach at this level. Known only when reachKnown is true; a parent's reach is never a sum of its children. */
  reach: number;
  reachKnown: boolean;
  /** Meta's own lead count for the entity's ads (delivery side). Used only to check tracking and the zero-leads rule. */
  metaLeads: number;
  /** Dashboard leads from Meta forms only (landing pages excluded). Used to compare with metaLeads. */
  metaFormLeads: number;
  /** Dashboard leads from every source. Zero when leadsKnown is false, so check leadsKnown first. */
  leads: number;
  sales: number;
  revenue: number;
  green: number;
  red: number;
  pending: number;
  unmapped: number;
  /** Leads counted here whose status could not be loaded. Sales and quality are a lower bound while this is above 0. */
  unknownStatusLeads: number;
}

/** Every derived figure the rules and the UI read. Lead-based figures are null whenever their inputs are not trustworthy. */
export interface Derived extends WindowFigures {
  /** Green + Red: the leads with a definitive quality class. Pending and Unmapped never count. */
  classified: number;
  frequency: number | null;
  /** Link CTR, in percent. */
  ctr: number | null;
  cpc: number | null;
  /** Cost per 1,000 impressions. */
  cpm: number | null;
  cpl: number | null;
  /** Cost per registration (spend / sales). */
  cpa: number | null;
  qualifiedCpl: number | null;
  /** Red / (Green + Red), in percent. */
  redRate: number | null;
  greenRate: number | null;
  /** (Green + Red) / leads, in percent. */
  classificationCoverage: number | null;
  closeRate: number | null;
}

export function emptyFigures(leadsKnown: boolean, reachKnown: boolean): WindowFigures {
  return {
    leadsKnown,
    spend: 0,
    impressions: 0,
    linkClicks: 0,
    reach: 0,
    reachKnown,
    metaLeads: 0,
    metaFormLeads: 0,
    leads: 0,
    sales: 0,
    revenue: 0,
    green: 0,
    red: 0,
    pending: 0,
    unmapped: 0,
    unknownStatusLeads: 0,
  };
}

function percentOf(part: number, whole: number): number | null {
  const rate = safeDivide(part, whole);
  return rate === null ? null : rate * 100;
}

/** The one place derived figures are computed. Both the engine and the UI read these, so they cannot disagree. */
export function deriveFigures(figures: WindowFigures): Derived {
  const classified = figures.green + figures.red;
  const leadsTrusted = figures.leadsKnown;
  const statusesTrusted = figures.leadsKnown && figures.unknownStatusLeads === 0;
  return {
    ...figures,
    classified,
    frequency: figures.reachKnown ? calcFrequency(figures.impressions, figures.reach) : null,
    ctr: calcCTR(figures.linkClicks, figures.impressions),
    cpc: calcCPC(figures.spend, figures.linkClicks),
    cpm: calcCPM(figures.spend, figures.impressions),
    cpl: leadsTrusted ? calcCPL(figures.spend, figures.leads) : null,
    cpa: statusesTrusted ? calcCostPerSale(figures.spend, figures.sales) : null,
    qualifiedCpl: statusesTrusted ? calcCPL(figures.spend, figures.green) : null,
    redRate: statusesTrusted ? percentOf(figures.red, classified) : null,
    greenRate: statusesTrusted ? percentOf(figures.green, classified) : null,
    classificationCoverage: statusesTrusted ? percentOf(classified, figures.leads) : null,
    closeRate: statusesTrusted ? calcCloseRate(figures.sales, figures.leads) : null,
  };
}

/** Relative change in percent against a previous value. Null when the previous value is zero or unknown. */
export function pctChange(current: number, previous: number): number | null {
  if (!(previous > 0) || !Number.isFinite(current)) return null;
  return ((current - previous) / previous) * 100;
}
