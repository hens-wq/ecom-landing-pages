import { calcCostPerSale } from "@/lib/calculations";
import type { Campaign, EntityStatus } from "@/lib/types";
import type { LeadQualityCampaign } from "./types";

/** Compact, own-attribution enrollment figures for one ad in the fixed 30-day lead cohort. */
export interface AdClosureSummary {
  adId: string;
  adName: string;
  adSetId: string | null;
  adSetName: string | null;
  status: EntityStatus | null;
  /** Actual current parent status from the source hierarchy; never inferred from the ad or campaign. */
  parentStatus: EntityStatus | null;
  isUnassigned: boolean;
  spend: number | null;
  totalLeads: number;
  closures: number;
  costPerClosure: number | null;
  complete: boolean;
}

export interface BuildAdClosureSummariesInput {
  campaign: LeadQualityCampaign;
  sourceCampaign?: Campaign;
  source?: "meta" | "mock";
}

/** No extra reads, no distribution of campaign registrations, no filtering of inactive or zero-result ads. */
export function buildAdClosureSummaries(input: BuildAdClosureSummariesInput): AdClosureSummary[] {
  const sourceSets = new Map(input.sourceCampaign?.adSets.map((adSet) => [adSet.id, adSet]) ?? []);
  const sourceAds = new Map(input.sourceCampaign?.adSets.flatMap((adSet) => adSet.ads.map((ad) => [ad.id, { ad, adSet }] as const)) ?? []);
  const demo = input.source === "mock";
  return input.campaign.ads.map((row): AdClosureSummary => {
    const source = sourceAds.get(row.id);
    const isUnassigned = row.isUnassigned || row.isUnlisted;
    const adSetId = isUnassigned ? null : source?.adSet.id ?? row.adSetId;
    const adSet = adSetId ? sourceSets.get(adSetId) : undefined;
    const spend = row.spend !== null && Number.isFinite(row.spend) && row.spend >= 0 ? row.spend : null;
    const recordedClosures = row.summary.sales.count;
    const validCount = Number.isInteger(recordedClosures) && recordedClosures >= 0 && recordedClosures <= row.totalLeads;
    const closures = !demo && validCount ? recordedClosures : 0;
    // Unmapped quality labels do not obscure the known main-status enrollment count.
    const complete = !demo && row.leadsKnown && row.unknownStatusLeads === 0 && validCount;
    return {
      adId: row.id,
      adName: row.name,
      adSetId,
      adSetName: isUnassigned ? null : source?.adSet.name ?? row.adSetName,
      status: isUnassigned ? null : source?.ad.status ?? row.status,
      parentStatus: isUnassigned ? null : adSet?.status ?? null,
      isUnassigned,
      spend,
      totalLeads: row.totalLeads,
      closures,
      costPerClosure: complete && !isUnassigned && spend !== null ? calcCostPerSale(spend, closures) : null,
      complete,
    };
  });
}
