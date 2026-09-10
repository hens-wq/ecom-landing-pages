import { computeMetrics, sumRawMetrics } from "@/lib/calculations";
import type { Campaign, EntityStatus, LeadSourceType, PerformanceMetrics } from "@/lib/types";

/**
 * The performance hierarchy (Campaign -> AdSet -> Ad), with every derived KPI
 * computed on top of whatever raw metrics the active advertising provider
 * (mock or Meta) returned for the requested date range - this function has no
 * idea which provider that was, or that a date range was even involved; any
 * range-based scaling already happened inside the provider itself. Ad Set /
 * Campaign rows are always a straight sum of their children's raw metrics, so
 * the tree can never show numbers at the parent level that disagree with the
 * children - there is exactly one source of truth (each Ad's RawMetrics).
 */
export interface AdRow {
  level: "ad";
  id: string;
  name: string;
  status: EntityStatus;
  destinationType: LeadSourceType;
  metrics: PerformanceMetrics;
}

export interface AdSetRow {
  level: "adset";
  id: string;
  name: string;
  status: EntityStatus;
  metrics: PerformanceMetrics;
  ads: AdRow[];
}

export interface CampaignRow {
  level: "campaign";
  id: string;
  name: string;
  objective: string;
  status: EntityStatus;
  metrics: PerformanceMetrics;
  adSets: AdSetRow[];
}

export function buildPerformanceTree(campaigns: Campaign[]): CampaignRow[] {
  return campaigns.map((campaign) => {
    const adSetRows: AdSetRow[] = campaign.adSets.map((adSet) => {
      const adRows: AdRow[] = adSet.ads.map((ad) => ({
        level: "ad",
        id: ad.id,
        name: ad.name,
        status: ad.status,
        destinationType: ad.destinationType,
        metrics: computeMetrics(ad.metrics),
      }));

      return {
        level: "adset",
        id: adSet.id,
        name: adSet.name,
        status: adSet.status,
        metrics: computeMetrics(sumRawMetrics(adRows.map((row) => row.metrics))),
        ads: adRows,
      };
    });

    return {
      level: "campaign",
      id: campaign.id,
      name: campaign.name,
      objective: campaign.objective,
      status: campaign.status,
      metrics: computeMetrics(sumRawMetrics(adSetRows.map((row) => row.metrics))),
      adSets: adSetRows,
    };
  });
}

export function aggregateTotals(campaignRows: CampaignRow[]): PerformanceMetrics {
  return computeMetrics(sumRawMetrics(campaignRows.map((row) => row.metrics)));
}

export function findAdRow(campaignRows: CampaignRow[], adId: string): AdRow | undefined {
  for (const campaign of campaignRows) {
    for (const adSet of campaign.adSets) {
      const ad = adSet.ads.find((row) => row.id === adId);
      if (ad) return ad;
    }
  }
  return undefined;
}
