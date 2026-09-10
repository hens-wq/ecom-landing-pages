import { computeMetrics, scaleRawMetrics, sumRawMetrics } from "@/lib/calculations";
import type { Campaign, DestinationType, EntityStatus, PerformanceMetrics } from "@/lib/types";

/**
 * The performance hierarchy (Campaign -> AdSet -> Ad) with every raw metric scaled
 * by the selected date-range preset and every derived KPI recomputed on top of it.
 * Ad Set / Campaign rows are always a straight sum of their children's raw metrics,
 * so the tree can never show numbers at the parent level that disagree with the
 * children - there is exactly one source of truth (each Ad's RawMetrics).
 */
export interface AdRow {
  level: "ad";
  id: string;
  name: string;
  status: EntityStatus;
  destinationType: DestinationType;
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

export function buildPerformanceTree(campaigns: Campaign[], scale: number): CampaignRow[] {
  return campaigns.map((campaign) => {
    const adSetRows: AdSetRow[] = campaign.adSets.map((adSet) => {
      const adRows: AdRow[] = adSet.ads.map((ad) => ({
        level: "ad",
        id: ad.id,
        name: ad.name,
        status: ad.status,
        destinationType: ad.destinationType,
        metrics: computeMetrics(scaleRawMetrics(ad.metrics, scale)),
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
