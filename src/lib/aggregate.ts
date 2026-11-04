import { computeMetrics, sumRawMetrics } from "@/lib/calculations";
import type { LeadAttribution } from "@/lib/performance/attribution";
import type { LeadBucket } from "@/lib/performance/lead-metrics";
import type { Campaign, EntityStatus, LeadSourceType, LevelReach, PerformanceMetrics, RawMetrics } from "@/lib/types";

/**
 * The performance hierarchy (Campaign -> AdSet -> Ad). Meta supplies the delivery
 * figures: spend, impressions, reach and link clicks. The lead figures (leads, sales,
 * revenue) come from the lead data through `attributeLeadFacts`, never from Meta's
 * own lead counts, so the dashboard and the Leads page always agree. Every derived
 * KPI is computed from raw numbers by computeMetrics.
 *
 * A parent row is the sum of its children for every additive figure. Its reach is
 * not summed: it is the unique reach Meta reports for that campaign or ad set (the
 * level reach). Without it, the parent's reach and frequency are unknown.
 *
 * Leads that no Meta ad can carry get synthetic rows marked `isUnassigned`. They hold
 * leads only. Their spend-based figures are "not applicable", not zero.
 */

/** How far a row's lead figures can be trusted. */
export interface RowFlags {
  /** Synthetic row for leads with no ad to attach them to. It has no spend, so spend-based figures don't apply. */
  isUnassigned: boolean;
  /** Synthetic row for ad spend the Meta listing did not return. It has spend and delivery figures, but no leads. */
  isUnlisted: boolean;
  /** False when the lead data could not be loaded. Lead-based figures are then unknown, never zero. */
  leadsKnown: boolean;
  /** Leads counted on this row whose status could not be loaded. Sales and revenue on it are a lower bound. */
  unknownStatusLeads: number;
}

export interface AdRow extends RowFlags {
  level: "ad";
  id: string;
  name: string;
  status: EntityStatus;
  destinationType: LeadSourceType;
  metrics: PerformanceMetrics;
}

export interface AdSetRow extends RowFlags {
  level: "adset";
  id: string;
  name: string;
  status: EntityStatus;
  metrics: PerformanceMetrics;
  ads: AdRow[];
}

export interface CampaignRow extends RowFlags {
  level: "campaign";
  id: string;
  name: string;
  objective: string;
  status: EntityStatus;
  metrics: PerformanceMetrics;
  adSets: AdSetRow[];
}

export const UNASSIGNED_CAMPAIGN_ID = "unassigned-campaign";
export const UNLISTED_CAMPAIGN_ID = "unlisted-ads";
const UNASSIGNED_AD_NAME = "לידים ללא מודעה מזוהה";
const UNASSIGNED_ADSET_NAME = "לידים ללא סדרת מודעות מזוהה";
const UNASSIGNED_CAMPAIGN_NAME = "לידים ללא שיוך לקמפיין";
const UNLISTED_CAMPAIGN_NAME = "הוצאה ממודעות שאינן ברשימה הנוכחית";

/** A synthetic row has no Meta delivery figures of its own, so its reach does not apply (null), not zero. */
const NO_DELIVERY: RawMetrics = { spend: 0, impressions: 0, reach: null, linkClicks: 0, leads: 0, sales: 0, revenue: 0 };

/**
 * One row's raw figures: the delivery figures (Meta's, or none) with the lead figures
 * from the lead data. Meta's own lead, sales and revenue numbers are never read here.
 */
function rawFor(delivery: RawMetrics, bucket: LeadBucket | undefined): RawMetrics {
  return {
    spend: delivery.spend,
    impressions: delivery.impressions,
    reach: delivery.reach,
    linkClicks: delivery.linkClicks,
    leads: bucket?.leads ?? 0,
    sales: bucket?.sales ?? 0,
    revenue: bucket?.revenue ?? 0,
  };
}

function ownFlags(bucket: LeadBucket | undefined, leadsKnown: boolean, isUnassigned: boolean): RowFlags {
  return { isUnassigned, isUnlisted: false, leadsKnown, unknownStatusLeads: bucket?.unknownStatusLeads ?? 0 };
}

/**
 * A parent's reach: the unique reach Meta reports for that row at its own level. Reach is not additive, so no sum of
 * the children is ever used. Without the level reach the reach is unknown (null). A row with no delivery has no
 * entry from Meta, and its reach is then zero.
 */
function levelReachOf(id: string, impressions: number, reaches: Record<string, number> | undefined): number | null {
  if (!reaches) return null;
  if (Object.prototype.hasOwnProperty.call(reaches, id)) return reaches[id];
  return impressions === 0 ? 0 : null;
}

/** A parent row: the summed figures of its children, with the reach Meta reports for the parent itself. */
function rollUp(
  children: Array<{ metrics: PerformanceMetrics; unknownStatusLeads: number }>,
  leadsKnown: boolean,
  id: string,
  reaches: Record<string, number> | undefined
): { metrics: PerformanceMetrics } & RowFlags {
  const summed = sumRawMetrics(children.map((child) => child.metrics));
  return {
    metrics: computeMetrics({ ...summed, reach: levelReachOf(id, summed.impressions, reaches) }),
    isUnassigned: false,
    isUnlisted: false,
    leadsKnown,
    unknownStatusLeads: children.reduce((total, child) => total + child.unknownStatusLeads, 0),
  };
}

function unassignedAdRow(adSetId: string, status: EntityStatus, bucket: LeadBucket, leadsKnown: boolean): AdRow {
  return {
    level: "ad",
    id: `unassigned-ad:${adSetId}`,
    name: UNASSIGNED_AD_NAME,
    status,
    destinationType: "unknown",
    ...ownFlags(bucket, leadsKnown, true),
    metrics: computeMetrics(rawFor(NO_DELIVERY, bucket)),
  };
}

function unassignedAdSetRow(campaignId: string, status: EntityStatus, bucket: LeadBucket, leadsKnown: boolean): AdSetRow {
  return {
    level: "adset",
    id: `unassigned-adset:${campaignId}`,
    name: UNASSIGNED_ADSET_NAME,
    status,
    ads: [],
    ...ownFlags(bucket, leadsKnown, true),
    metrics: computeMetrics(rawFor(NO_DELIVERY, bucket)),
  };
}

/**
 * Builds the campaign tree. Without `attribution` (the Leads page and the export
 * use the tree only for names and spend), lead figures are unknown rather than zero.
 * Without `levelReach`, every campaign's and ad set's reach is unknown (never summed from its ads).
 */
export function buildPerformanceTree(
  campaigns: Campaign[],
  attribution?: LeadAttribution,
  unlisted?: RawMetrics | null,
  levelReach?: LevelReach | null
): CampaignRow[] {
  const leadsKnown = attribution !== undefined;
  // Undefined when the level reach did not load, so every parent's reach stays unknown.
  const campaignReaches = levelReach?.campaign;
  const adSetReaches = levelReach?.adset;

  const rows: CampaignRow[] = campaigns.map((campaign) => {
    const adSetRows: AdSetRow[] = campaign.adSets.map((adSet) => {
      const adRows: AdRow[] = adSet.ads.map((ad) => {
        const bucket = attribution?.byAd.get(ad.id);
        return {
          level: "ad",
          id: ad.id,
          name: ad.name,
          status: ad.status,
          destinationType: ad.destinationType,
          ...ownFlags(bucket, leadsKnown, false),
          metrics: computeMetrics(rawFor(ad.metrics, bucket)),
        };
      });

      const directAdSetLeads = attribution?.byAdSet.get(adSet.id);
      if (directAdSetLeads && directAdSetLeads.leads > 0) {
        adRows.push(unassignedAdRow(adSet.id, adSet.status, directAdSetLeads, leadsKnown));
      }

      return {
        level: "adset",
        id: adSet.id,
        name: adSet.name,
        status: adSet.status,
        ads: adRows,
        ...rollUp(adRows, leadsKnown, adSet.id, adSetReaches),
      };
    });

    const directCampaignLeads = attribution?.byCampaign.get(campaign.id);
    if (directCampaignLeads && directCampaignLeads.leads > 0) {
      adSetRows.push(unassignedAdSetRow(campaign.id, campaign.status, directCampaignLeads, leadsKnown));
    }

    return {
      level: "campaign",
      id: campaign.id,
      name: campaign.name,
      objective: campaign.objective,
      status: campaign.status,
      adSets: adSetRows,
      ...rollUp(adSetRows, leadsKnown, campaign.id, campaignReaches),
    };
  });

  if (attribution && attribution.unassigned.leads > 0) {
    rows.push({
      level: "campaign",
      id: UNASSIGNED_CAMPAIGN_ID,
      name: UNASSIGNED_CAMPAIGN_NAME,
      objective: "",
      status: "ended",
      adSets: [],
      ...ownFlags(attribution.unassigned, leadsKnown, true),
      metrics: computeMetrics(rawFor(NO_DELIVERY, attribution.unassigned)),
    });
  }

  // Ad spend the listing did not return. It counts toward every total, but it holds no leads, so lead figures don't apply to it.
  if (unlisted) {
    rows.push({
      level: "campaign",
      id: UNLISTED_CAMPAIGN_ID,
      name: UNLISTED_CAMPAIGN_NAME,
      objective: "",
      status: "ended",
      adSets: [],
      isUnassigned: false,
      isUnlisted: true,
      leadsKnown: true,
      unknownStatusLeads: 0,
      metrics: computeMetrics(unlisted),
    });
  }

  return rows;
}

/**
 * Totals for a set of top-level rows. Each row already holds its whole subtree, so nothing is counted twice. Additive
 * figures are summed. Reach is passed in: it is the unique reach Meta reports for exactly these rows, or null when it
 * is not known for that set. It is never summed across rows.
 */
export function aggregateTotals(rows: Array<{ metrics: RawMetrics }>, reach: number | null): PerformanceMetrics {
  return computeMetrics({ ...sumRawMetrics(rows.map((row) => row.metrics)), reach });
}

/** Lead flags for a set of top-level rows: the lead figures are known only when every row's are. */
export function aggregateFlags(rows: RowFlags[]): { leadsKnown: boolean; unknownStatusLeads: number } {
  // The unlisted row holds no leads, so it says nothing about whether the lead data loaded.
  const leadRows = rows.filter((row) => !row.isUnlisted);
  return {
    leadsKnown: leadRows.every((row) => row.leadsKnown),
    unknownStatusLeads: leadRows.reduce((total, row) => total + row.unknownStatusLeads, 0),
  };
}

