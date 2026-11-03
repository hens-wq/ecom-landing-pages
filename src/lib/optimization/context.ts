import { CLASSIFIED_MEANINGFUL_FROM, LEADS_MEANINGFUL_FROM, TREND_MIN_IMPRESSIONS, TREND_MIN_LINK_CLICKS } from "@/lib/optimization/thresholds";
import { deriveFigures, pctChange, type Derived } from "@/lib/optimization/derive";
import type { EngineInput, EntityInput } from "@/lib/optimization/model";

/** Everything a rule may read about one entity. Rules are pure functions of this object. */
export interface RuleContext {
  entity: EntityInput;
  rangeDays: number;
  selectedPartial: boolean;
  trendAvailable: boolean;
  sel: Derived;
  cur: Derived | null;
  prev: Derived | null;
  /** The parent's selected impressions were zero, so the parent already carries the delivery problem. */
  parentZeroImpressions: boolean;
}

export function buildRuleContext(entity: EntityInput, input: EngineInput, parentZeroImpressions: boolean): RuleContext {
  const sel = deriveFigures(entity.selected);
  const cur = entity.trendCurrent ? deriveFigures(entity.trendCurrent) : null;
  const prev = entity.trendPrevious ? deriveFigures(entity.trendPrevious) : null;
  return {
    entity,
    rangeDays: input.rangeDays,
    selectedPartial: input.selectedPartial,
    trendAvailable: input.trendAvailable && cur !== null && prev !== null,
    sel,
    cur,
    prev,
    parentZeroImpressions,
  };
}

/** A lead-based sample is meaningful when the leads are known and there are enough of them. */
export function leadSampleMeaningful(d: Derived): boolean {
  return d.leadsKnown && d.leads >= LEADS_MEANINGFUL_FROM;
}

export function classifiedMeaningful(d: Derived): boolean {
  return d.classified >= CLASSIFIED_MEANINGFUL_FROM;
}

/**
 * Relative changes against the previous period. Each change is computed only when both periods pass their own sample
 * bar (spec section 7), so a noisy small number never becomes a trend.
 */
export interface TrendChanges {
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  cpl: number | null;
  cpa: number | null;
  reach: number | null;
  spend: number | null;
}

export function trendChanges(cur: Derived | null, prev: Derived | null): TrendChanges {
  const none: TrendChanges = { ctr: null, cpc: null, cpm: null, cpl: null, cpa: null, reach: null, spend: null };
  if (!cur || !prev) return none;

  const impressionsOk = cur.impressions >= TREND_MIN_IMPRESSIONS && prev.impressions >= TREND_MIN_IMPRESSIONS;
  const clicksOk = cur.linkClicks >= TREND_MIN_LINK_CLICKS && prev.linkClicks >= TREND_MIN_LINK_CLICKS;
  const leadsOk = leadSampleMeaningful(cur) && leadSampleMeaningful(prev);

  return {
    ctr: impressionsOk && cur.ctr !== null && prev.ctr !== null ? pctChange(cur.ctr, prev.ctr) : null,
    cpc: clicksOk && cur.cpc !== null && prev.cpc !== null ? pctChange(cur.cpc, prev.cpc) : null,
    cpm: impressionsOk && cur.cpm !== null && prev.cpm !== null ? pctChange(cur.cpm, prev.cpm) : null,
    cpl: leadsOk && cur.cpl !== null && prev.cpl !== null ? pctChange(cur.cpl, prev.cpl) : null,
    cpa: cur.cpa !== null && prev.cpa !== null ? pctChange(cur.cpa, prev.cpa) : null,
    reach: impressionsOk && cur.reachKnown && prev.reachKnown ? pctChange(cur.reach, prev.reach) : null,
    spend: cur.spend > 0 && prev.spend > 0 ? pctChange(cur.spend, prev.spend) : null,
  };
}
