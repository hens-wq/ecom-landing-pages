import "server-only";

import { EXCLUDED_CAMPAIGNS, isExcludedCampaignId } from "@/lib/campaign-scope";
import { checkMetaConfig, type MetaConfig } from "@/lib/advertising/meta/config";
import { MetaAdvertisingProvider } from "@/lib/advertising/meta/provider";
import { MockAdvertisingProvider } from "@/lib/advertising/mock-provider";
import { isoDateInTimezone } from "@/lib/advertising/timezone";
import { AdvertisingApiError, type AdvertisingSnapshot, type DateRange } from "@/lib/advertising/types";
import { attributeLeadFacts } from "@/lib/performance/attribution";
import { liveLeadFactsSources } from "@/lib/performance/lead-fact-sources";
import { loadLeadFacts } from "@/lib/performance/load-lead-facts";
import type { LeadFact, SourceState } from "@/lib/performance/types";
import { dateInRange, planPeriods, type PeriodPlan } from "@/lib/optimization/periods";
import type { DailyAdSpendRow, EngineInput } from "@/lib/optimization/model";
import { buildWindowEntities, combineWindowEntities } from "@/lib/optimization/snapshot";
import type { DataSource, RunScope, RunSources } from "@/lib/optimization/run";
import { META_NOT_CONFIGURED_MESSAGE, demoDataEnabled } from "@/lib/runtime-mode";
import type { Campaign, LevelReach } from "@/lib/types";

/**
 * Reads everything one analysis run needs, for the selected range and its trend windows. Read-only: Meta is only read,
 * and every call is a GET. Failures are reported in the run's notes; a failed Meta listing stops the run instead of
 * producing an empty report.
 */

type Mode = { kind: "meta"; config: MetaConfig } | { kind: "demo" };

function resolveMode(): Mode {
  const check = checkMetaConfig();
  if (check.status === "unconfigured") {
    if (!demoDataEnabled()) {
      throw new AdvertisingApiError("not_configured", META_NOT_CONFIGURED_MESSAGE, "Meta env vars are empty and ECOM_DEMO_DATA is not set");
    }
    return { kind: "demo" };
  }
  if (check.status === "incomplete") {
    const missing = check.missing.join(", ");
    throw new AdvertisingApiError(
      check.missing.includes("META_ACCESS_TOKEN") ? "missing_token" : "missing_account_id",
      `הגדרת Meta Ads חסרה: ${missing}. יש להשלים את שני משתני הסביבה כדי להתחבר.`,
      `Missing env vars: ${missing}`
    );
  }
  return { kind: "meta", config: check.config };
}

const rangeKey = (range: DateRange): string => `${range.since}|${range.until}`;

function uniqueRanges(ranges: Array<DateRange | null>): DateRange[] {
  const seen = new Map<string, DateRange>();
  for (const range of ranges) {
    if (range) seen.set(rangeKey(range), range);
  }
  return [...seen.values()];
}

interface WindowData {
  snapshot: AdvertisingSnapshot;
  /** Meta's unique reach per campaign and ad set for the window. Null when it could not be read. */
  levelReach: LevelReach | null;
}

async function fetchWindow(mode: Mode, range: DateRange, notes: string[]): Promise<WindowData> {
  if (mode.kind === "demo") {
    const provider = new MockAdvertisingProvider();
    const [snapshot, levelReach] = await Promise.all([provider.getCampaigns(range), provider.getLevelReach(range)]);
    return { snapshot, levelReach };
  }

  const provider = new MetaAdvertisingProvider(mode.config);
  const [snapshot, levelReach] = await Promise.all([
    provider.getCampaigns(range),
    provider.getLevelReach(range).then(
      (levels): LevelReach => levels,
      (): null => null
    ),
  ]);
  if (levelReach === null) {
    notes.push("התפוצה של הקמפיין וה-Ad Set לא נטענה מ-Meta: תפוצה ותדירות ברמות האלה לא מוצגות.");
  }
  return { snapshot, levelReach };
}

/** Demo only: a flat daily split, so the daily check runs without inventing a pattern. */
function demoDailySpend(campaigns: Campaign[], dates: string[]): DailyAdSpendRow[] {
  const rows: DailyAdSpendRow[] = [];
  for (const campaign of campaigns) {
    for (const adSet of campaign.adSets) {
      for (const ad of adSet.ads) {
        const perDay = ad.metrics.spend / dates.length;
        for (const date of dates) rows.push({ adId: ad.id, campaignId: campaign.id, date, spend: perDay });
      }
    }
  }
  return rows;
}

async function fetchDailyAdSpend(
  mode: Mode,
  plan: PeriodPlan,
  campaigns: Campaign[],
  notes: string[]
): Promise<DailyAdSpendRow[] | null> {
  const dates = plan.completeDates;
  if (dates.length === 0) return [];
  if (mode.kind === "demo") return demoDailySpend(campaigns, dates);

  try {
    const rows = await new MetaAdvertisingProvider(mode.config).getDailyAdSpend({
      since: dates[0],
      until: dates[dates.length - 1],
    });
    const completeSet = new Set(dates);
    return rows
      .filter((row) => completeSet.has(row.date_start) && !isExcludedCampaignId(row.campaign_id))
      .map((row) => ({ adId: row.ad_id, campaignId: row.campaign_id, date: row.date_start, spend: Number(row.spend ?? 0) }));
  } catch {
    notes.push("ההוצאה היומית לא נטענה מ-Meta: ריכוז התקציב לא נבדק בטווח הזה.");
    return null;
  }
}

export interface CollectedRun {
  dataFetchedAt: string;
  dataSource: DataSource;
  plan: PeriodPlan;
  engineInput: EngineInput;
  scope: RunScope;
  sources: RunSources;
  comparison: { current: DateRange | null; previous: DateRange | null; note: string };
}

export async function collectOptimizationRun(selected: DateRange, now: Date): Promise<CollectedRun> {
  const mode = resolveMode();
  const plan = planPeriods(selected, isoDateInTimezone(now));
  const notes: string[] = [];
  if (mode.kind === "demo") {
    notes.push("מצב דמו: הנתונים סינתטיים. התפוצה של הקמפיין וה-Ad Set היא ערך סינתטי משלה, לא סכום המודעות.");
  }

  const windowRanges = uniqueRanges([plan.selected, plan.trendCurrent, plan.trendPrevious]);
  const span: DateRange = {
    since: windowRanges.reduce((earliest, range) => (range.since < earliest ? range.since : earliest), selected.since),
    until: windowRanges.reduce((latest, range) => (range.until > latest ? range.until : latest), selected.until),
  };

  const [windowResults, leadResult] = await Promise.all([
    Promise.all(windowRanges.map(async (range) => [rangeKey(range), await fetchWindow(mode, range, notes)] as const)),
    loadLeadFacts(span, liveLeadFactsSources),
  ]);
  const windows = new Map(windowResults);
  const dataFor = (range: DateRange): WindowData => {
    const data = windows.get(rangeKey(range));
    if (!data) throw new Error("optimization: a window was not fetched");
    return data;
  };

  const metaOk = leadResult.sources.meta.state === "ok";
  const landingOk = leadResult.sources.landing.state === "ok";
  const leadsState: SourceState = metaOk && landingOk ? "ok" : metaOk || landingOk ? "partial" : "unavailable";
  const leadsKnown = leadsState === "ok";
  if (!metaOk && leadResult.sources.meta.message) notes.push(leadResult.sources.meta.message);
  if (!landingOk && leadResult.sources.landing.message) notes.push(leadResult.sources.landing.message);
  if (leadResult.sources.statuses.state !== "ok" && leadResult.sources.statuses.message) {
    notes.push(leadResult.sources.statuses.message);
  }

  // Lead figures are trusted only when both lead sources loaded in full. Otherwise every lead figure is unknown.
  const leadFactsFor = (range: DateRange): LeadFact[] | null =>
    leadsKnown ? leadResult.leads.filter((lead) => dateInRange(lead.leadDate, range)) : null;

  const selectedData = dataFor(plan.selected);
  // Leads of the selected window that no unit carries. Counted once, here, so the rules and the saved report agree.
  const selectedLeads = leadFactsFor(plan.selected);
  const attributionGaps = selectedLeads === null ? null : attributeLeadFacts(selectedData.snapshot.campaigns, selectedLeads).gaps;
  if (attributionGaps && attributionGaps.unassigned > 0) {
    notes.push(
      `יש ${attributionGaps.unassigned} לידים בטווח בלי שיוך מלא ליחידה (בלי מזהה: ${attributionGaps.noIds}, מזהה שלא ברשימה: ${attributionGaps.idNotListed}). הם נספרים בחשבון, אבל לא ביחידה.`
    );
  }
  const selectedEntities = buildWindowEntities({
    campaigns: selectedData.snapshot.campaigns,
    leadFacts: leadFactsFor(plan.selected),
    levelReach: selectedData.levelReach,
  });
  const currentEntities = plan.trendCurrent
    ? buildWindowEntities({
        campaigns: dataFor(plan.trendCurrent).snapshot.campaigns,
        leadFacts: leadFactsFor(plan.trendCurrent),
        levelReach: dataFor(plan.trendCurrent).levelReach,
      })
    : null;
  const previousEntities = plan.trendPrevious
    ? buildWindowEntities({
        campaigns: dataFor(plan.trendPrevious).snapshot.campaigns,
        leadFacts: leadFactsFor(plan.trendPrevious),
        levelReach: dataFor(plan.trendPrevious).levelReach,
      })
    : null;

  const entities = combineWindowEntities({
    selected: selectedEntities,
    current: currentEntities,
    previous: previousEntities,
  });
  const dailyAdSpend = await fetchDailyAdSpend(mode, plan, selectedData.snapshot.campaigns, notes);

  const engineInput: EngineInput = {
    rangeDays: plan.selectedDays,
    selectedPartial: plan.selectedPartial,
    completeDates: plan.completeDates,
    trendAvailable: plan.trendCurrent !== null,
    dailyAdSpend,
    entities,
    sourceNotes: notes,
    attributionGaps,
  };

  const scope: RunScope = {
    exclusions: EXCLUDED_CAMPAIGNS.map((campaign) => ({ id: campaign.id, name: campaign.name })),
    excludedSpend: selectedData.snapshot.excludedSpend,
    unlistedSpend: selectedData.snapshot.unlisted ? selectedData.snapshot.unlisted.spend : null,
    note: "ההחרגה לפי Campaign ID בלבד. נתוני הקמפיין המוחרג נשארים ב-Meta ובמסד הנתונים.",
  };

  return {
    dataFetchedAt: new Date().toISOString(),
    dataSource: mode.kind === "demo" ? "demo" : "meta",
    plan,
    engineInput,
    scope,
    sources: {
      meta: "ok",
      leads: leadsState,
      statuses: leadResult.sources.statuses.state,
      notes,
    },
    comparison: { current: plan.trendCurrent, previous: plan.trendPrevious, note: plan.trendNote },
  };
}
