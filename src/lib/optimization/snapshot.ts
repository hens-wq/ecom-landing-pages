import { buildPerformanceTree } from "@/lib/aggregate";
import { attributeLeadFacts } from "@/lib/performance/attribution";
import { classifyLeadQuality } from "@/lib/performance/lead-quality";
import type { LeadFact } from "@/lib/performance/types";
import type { Campaign, EntityStatus } from "@/lib/types";
import { emptyFigures, type WindowFigures } from "@/lib/optimization/derive";
import { entityKey, type EntityInput, type Level } from "@/lib/optimization/model";

/**
 * Builds per-entity figures for one window from the Meta tree and the lead facts. The lead attribution is the same one
 * the dashboard uses (aggregate.ts and attribution.ts), so the two numbers always agree. Reach at campaign and ad set
 * level is never a sum of child reach, because unique reach is not additive: it comes from Meta, or it is unknown.
 */

/** Where the reach of campaigns and ad sets comes from. */
export type ReachSource =
  /** Meta's own unique reach at each level, read for this window. */
  | { mode: "meta"; campaign: ReadonlyMap<string, number>; adset: ReadonlyMap<string, number> }
  /** Demo data only: a parent's reach is the sum of its ads' reach, which is shown as an approximation. */
  | { mode: "sum" }
  /** Meta's level reach could not be read: parent reach is unknown and no parent frequency verdict is given. */
  | { mode: "unknown" };

export interface WindowSource {
  campaigns: Campaign[];
  /** Leads whose reporting date falls inside this window. Null when lead data did not load in full. */
  leadFacts: LeadFact[] | null;
  reach: ReachSource;
}

export interface WindowEntity {
  key: string;
  level: Level;
  id: string;
  name: string;
  status: EntityStatus;
  campaignId: string;
  campaignName: string;
  parentId: string | null;
  figures: WindowFigures;
}

interface LeadCounts {
  green: number;
  red: number;
  pending: number;
  unmapped: number;
  /** Dashboard leads from Meta forms, regardless of status. */
  metaForm: number;
}

const ZERO_COUNTS: LeadCounts = { green: 0, red: 0, pending: 0, unmapped: 0, metaForm: 0 };

function addCounts(a: LeadCounts, b: LeadCounts): LeadCounts {
  return {
    green: a.green + b.green,
    red: a.red + b.red,
    pending: a.pending + b.pending,
    unmapped: a.unmapped + b.unmapped,
    metaForm: a.metaForm + b.metaForm,
  };
}

const META_FORM_SOURCES = new Set(["meta_standard_form", "meta_rich_form"]);

/**
 * The lead counts each listed entity owns directly, before roll-up. The same deepest-level rule as attribution.ts:
 * a lead belongs to its ad if the ad is listed, else to its ad set, else to its campaign.
 */
function ownLeadCounts(campaigns: Campaign[], facts: LeadFact[]): Map<string, LeadCounts> {
  const adIds = new Set<string>();
  const adSetIds = new Set<string>();
  const campaignIds = new Set<string>();
  for (const campaign of campaigns) {
    campaignIds.add(campaign.id);
    for (const adSet of campaign.adSets) {
      adSetIds.add(adSet.id);
      for (const ad of adSet.ads) adIds.add(ad.id);
    }
  }

  const own = new Map<string, LeadCounts>();
  for (const lead of facts) {
    let key: string | null = null;
    if (lead.adId && adIds.has(lead.adId)) key = entityKey("ad", lead.adId);
    else if (lead.adSetId && adSetIds.has(lead.adSetId)) key = entityKey("adset", lead.adSetId);
    else if (lead.campaignId && campaignIds.has(lead.campaignId)) key = entityKey("campaign", lead.campaignId);
    if (key === null) continue;

    const current = own.get(key) ?? ZERO_COUNTS;
    const quality = lead.statusKnown ? classifyLeadQuality(lead.secondaryStatus) : null;
    own.set(key, {
      green: current.green + (quality === "green" ? 1 : 0),
      red: current.red + (quality === "red" ? 1 : 0),
      pending: current.pending + (quality === "pending" ? 1 : 0),
      unmapped: current.unmapped + (quality === "unmapped" ? 1 : 0),
      metaForm: current.metaForm + (META_FORM_SOURCES.has(lead.sourceType) ? 1 : 0),
    });
  }
  return own;
}

export function buildWindowEntities(source: WindowSource): Map<string, WindowEntity> {
  const facts = source.leadFacts;
  const leadsKnown = facts !== null;
  const attribution = facts === null ? undefined : attributeLeadFacts(source.campaigns, facts);
  const tree = buildPerformanceTree(source.campaigns, attribution);
  const own = facts === null ? new Map<string, LeadCounts>() : ownLeadCounts(source.campaigns, facts);
  const countsOf = (keys: string[]): LeadCounts =>
    keys.reduce((total, key) => addCounts(total, own.get(key) ?? ZERO_COUNTS), ZERO_COUNTS);

  const metaLeadsByAd = new Map<string, number>();
  for (const campaign of source.campaigns) {
    for (const adSet of campaign.adSets) {
      for (const ad of adSet.ads) metaLeadsByAd.set(ad.id, ad.metrics.leads);
    }
  }

  const result = new Map<string, WindowEntity>();
  const put = (entity: Omit<WindowEntity, "key">) => {
    result.set(entityKey(entity.level, entity.id), { ...entity, key: entityKey(entity.level, entity.id) });
  };

  for (const campaignRow of tree) {
    // Synthetic rows (leads with no listed parent, and the unlisted spend) are totals only, never entities.
    if (campaignRow.isUnassigned || campaignRow.isUnlisted) continue;
    const campaignRows = campaignRow;
    const adSets = campaignRows.adSets.filter((adSet) => !adSet.isUnassigned);
    const ads = adSets.flatMap((adSet) => adSet.ads.filter((ad) => !ad.isUnassigned));

    const campaignAdKeys = ads.map((ad) => entityKey("ad", ad.id));
    const campaignCounts = countsOf([entityKey("campaign", campaignRows.id), ...adSets.map((adSet) => entityKey("adset", adSet.id)), ...campaignAdKeys]);
    const campaignMetaLeads = ads.reduce((total, ad) => total + (metaLeadsByAd.get(ad.id) ?? 0), 0);
    const campaignSumReach = ads.reduce((total, ad) => total + ad.metrics.reach, 0);
    put({
      level: "campaign",
      id: campaignRows.id,
      name: campaignRows.name,
      status: campaignRows.status,
      campaignId: campaignRows.id,
      campaignName: campaignRows.name,
      parentId: null,
      figures: {
        leadsKnown,
        spend: campaignRows.metrics.spend,
        impressions: campaignRows.metrics.impressions,
        linkClicks: campaignRows.metrics.linkClicks,
        reach: source.reach.mode === "meta" ? source.reach.campaign.get(campaignRows.id) ?? 0 : campaignSumReach,
        reachKnown: source.reach.mode !== "unknown",
        metaLeads: campaignMetaLeads,
        metaFormLeads: campaignCounts.metaForm,
        leads: campaignRows.metrics.leads,
        sales: campaignRows.metrics.sales,
        revenue: campaignRows.metrics.revenue,
        green: campaignCounts.green,
        red: campaignCounts.red,
        pending: campaignCounts.pending,
        unmapped: campaignCounts.unmapped,
        unknownStatusLeads: campaignRows.unknownStatusLeads,
      },
    });

    for (const adSetRow of adSets) {
      const adSetAds = adSetRow.ads.filter((ad) => !ad.isUnassigned);
      const adSetCounts = countsOf([entityKey("adset", adSetRow.id), ...adSetAds.map((ad) => entityKey("ad", ad.id))]);
      const adSetMetaLeads = adSetAds.reduce((total, ad) => total + (metaLeadsByAd.get(ad.id) ?? 0), 0);
      const adSetSumReach = adSetAds.reduce((total, ad) => total + ad.metrics.reach, 0);
      put({
        level: "adset",
        id: adSetRow.id,
        name: adSetRow.name,
        status: adSetRow.status,
        campaignId: campaignRows.id,
        campaignName: campaignRows.name,
        parentId: campaignRows.id,
        figures: {
          leadsKnown,
          spend: adSetRow.metrics.spend,
          impressions: adSetRow.metrics.impressions,
          linkClicks: adSetRow.metrics.linkClicks,
          reach: source.reach.mode === "meta" ? source.reach.adset.get(adSetRow.id) ?? 0 : adSetSumReach,
          reachKnown: source.reach.mode !== "unknown",
          metaLeads: adSetMetaLeads,
          metaFormLeads: adSetCounts.metaForm,
          leads: adSetRow.metrics.leads,
          sales: adSetRow.metrics.sales,
          revenue: adSetRow.metrics.revenue,
          green: adSetCounts.green,
          red: adSetCounts.red,
          pending: adSetCounts.pending,
          unmapped: adSetCounts.unmapped,
          unknownStatusLeads: adSetRow.unknownStatusLeads,
        },
      });

      for (const adRow of adSetAds) {
        const counts = countsOf([entityKey("ad", adRow.id)]);
        put({
          level: "ad",
          id: adRow.id,
          name: adRow.name,
          status: adRow.status,
          campaignId: campaignRows.id,
          campaignName: campaignRows.name,
          parentId: adSetRow.id,
          figures: {
            leadsKnown,
            spend: adRow.metrics.spend,
            impressions: adRow.metrics.impressions,
            linkClicks: adRow.metrics.linkClicks,
            // An ad's own reach is exact: it is read for the ad itself, not summed.
            reach: adRow.metrics.reach,
            reachKnown: true,
            metaLeads: metaLeadsByAd.get(adRow.id) ?? 0,
            metaFormLeads: counts.metaForm,
            leads: adRow.metrics.leads,
            sales: adRow.metrics.sales,
            revenue: adRow.metrics.revenue,
            green: counts.green,
            red: counts.red,
            pending: counts.pending,
            unmapped: counts.unmapped,
            unknownStatusLeads: adRow.unknownStatusLeads,
          },
        });
      }
    }
  }

  return result;
}

/**
 * Joins the selected window with its trend windows into the engine's entity list. An entity keeps its identity from
 * the selected window, and its trend figures come from the same entity in the trend windows (or are null).
 */
export function combineWindowEntities(windows: {
  selected: ReadonlyMap<string, WindowEntity>;
  current: ReadonlyMap<string, WindowEntity> | null;
  previous: ReadonlyMap<string, WindowEntity> | null;
}): EntityInput[] {
  const keys = new Set<string>([
    ...windows.selected.keys(),
    ...(windows.current?.keys() ?? []),
    ...(windows.previous?.keys() ?? []),
  ]);

  const entities: EntityInput[] = [];
  for (const key of keys) {
    const base = windows.selected.get(key) ?? windows.current?.get(key) ?? windows.previous?.get(key);
    if (!base) continue;
    entities.push({
      level: base.level,
      id: base.id,
      name: base.name,
      status: base.status,
      campaignId: base.campaignId,
      campaignName: base.campaignName,
      parentId: base.parentId,
      selected: windows.selected.get(key)?.figures ?? emptyFigures(false, false),
      trendCurrent: windows.current?.get(key)?.figures ?? null,
      trendPrevious: windows.previous?.get(key)?.figures ?? null,
    });
  }
  return entities;
}
