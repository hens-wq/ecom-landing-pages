import { computeMetrics, sumRawMetrics } from "@/lib/calculations";
import type { LeadAttribution } from "@/lib/performance/attribution";
import type { LeadBucket } from "@/lib/performance/lead-metrics";
import type { Campaign, EntityStatus, LeadSourceType, PerformanceMetrics, RawMetrics } from "@/lib/types";

/**
 * The performance hierarchy (Campaign -> AdSet -> Ad). Meta supplies the delivery
 * figures: spend, impressions, reach and link clicks. The lead figures (leads, sales,
 * revenue) come from the lead data through `attributeLeadFacts`, never from Meta's
 * own lead counts, so the dashboard and the Leads page always agree. Every derived
 * KPI is computed from raw numbers by computeMetrics. A parent row is the sum of its
 * children, so the tree can never show a parent that disagrees with its children.
 *
 * Leads that no Meta ad can carry get synthetic rows marked `isUnassigned`. They hold
 * leads only. Their spend-based figures are "not applicable", not zero.
 */

/** How far a row's lead figures can be trusted. */
export interface RowFlags {
  /** Synthetic row for leads with no ad to attach them to. It has no spend, so spend-based figures don't apply. */
  isUnassigned: boolean;
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
const UNASSIGNED_AD_NAME = "לידים ללא מודעה מזוהה";
const UNASSIGNED_ADSET_NAME = "לידים ללא סדרת מודעות מזוהה";
const UNASSIGNED_CAMPAIGN_NAME = "לידים ללא שיוך לקמפיין";

/** A synthetic row has no Meta delivery figures of its own. */
const NO_DELIVERY: RawMetrics = { spend: 0, impressions: 0, reach: 0, linkClicks: 0, leads: 0, sales: 0, revenue: 0 };

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
  return { isUnassigned, leadsKnown, unknownStatusLeads: bucket?.unknownStatusLeads ?? 0 };
}

/** A parent row: the summed figures of its children. */
function rollUp(
  children: Array<{ metrics: PerformanceMetrics; unknownStatusLeads: number }>,
  leadsKnown: boolean
): { metrics: PerformanceMetrics } & RowFlags {
  return {
    metrics: computeMetrics(sumRawMetrics(children.map((child) => child.metrics))),
    isUnassigned: false,
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
 */
export function buildPerformanceTree(campaigns: Campaign[], attribution?: LeadAttribution): CampaignRow[] {
  const leadsKnown = attribution !== undefined;

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
        ...rollUp(adRows, leadsKnown),
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
      ...rollUp(adSetRows, leadsKnown),
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

  return rows;
}

/** Totals for a set of top-level rows. Each row already holds its whole subtree, so nothing is counted twice. */
export function aggregateTotals(rows: Array<{ metrics: RawMetrics }>): PerformanceMetrics {
  return computeMetrics(sumRawMetrics(rows.map((row) => row.metrics)));
}

/** Lead flags for a set of top-level rows: the lead figures are known only when every row's are. */
export function aggregateFlags(rows: RowFlags[]): { leadsKnown: boolean; unknownStatusLeads: number } {
  return {
    leadsKnown: rows.every((row) => row.leadsKnown),
    unknownStatusLeads: rows.reduce((total, row) => total + row.unknownStatusLeads, 0),
  };
}

