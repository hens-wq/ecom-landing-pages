import { addLeadToBucket, createBucket, type LeadBucket } from "@/lib/performance/lead-metrics";
import type { LeadFact } from "@/lib/performance/types";
import type { Campaign } from "@/lib/types";

/**
 * Leads of one window that no listed campaign, ad set or ad can carry. They count in the account totals, but no unit row
 * can claim them, so a unit's zero is not a verdict while one of them could belong to that unit.
 */
export interface AttributionGaps {
  /** Leads with no listed campaign, ad set or ad. */
  unassigned: number;
  /** Of those: no Campaign, Ad Set or Ad ID at all. */
  noIds: number;
  /** Of those: an ID was sent, but it is not in the listing for this window. */
  idNotListed: number;
  /** Of those: landing-page leads. */
  landing: number;
}

export interface LeadAttribution {
  /** Leads attributed to a listed ad. */
  byAd: Map<string, LeadBucket>;
  /** Leads that carry a listed ad set but no listed ad. */
  byAdSet: Map<string, LeadBucket>;
  /** Leads that carry a listed campaign but no listed ad set or ad. */
  byCampaign: Map<string, LeadBucket>;
  /** Leads whose campaign is missing or not in the account's campaign list. */
  unassigned: LeadBucket;
  gaps: AttributionGaps;
}

export interface ListedIds {
  campaignIds: Set<string>;
  adSetIds: Set<string>;
  adIds: Set<string>;
}

/** Where one lead belongs. The two unassigned outcomes say why it belongs to no listed unit. */
export type AttributionOutcome = "ad" | "adset" | "campaign" | "unassigned_no_ids" | "unassigned_id_not_listed";

export function listedIdsOf(campaigns: Campaign[]): ListedIds {
  const listed: ListedIds = { campaignIds: new Set(), adSetIds: new Set(), adIds: new Set() };
  for (const campaign of campaigns) {
    listed.campaignIds.add(campaign.id);
    for (const adSet of campaign.adSets) {
      listed.adSetIds.add(adSet.id);
      for (const ad of adSet.ads) listed.adIds.add(ad.id);
    }
  }
  return listed;
}

/**
 * The one rule that places a lead: its ad if that ad is listed, else its ad set, else its campaign. A lead with no
 * listed ID is unassigned. Matching is by ID only, never by name. attributeLeadFacts and the diagnostics both use it.
 */
export function classifyAttribution(lead: Pick<LeadFact, "adId" | "adSetId" | "campaignId">, listed: ListedIds): AttributionOutcome {
  if (lead.adId && listed.adIds.has(lead.adId)) return "ad";
  if (lead.adSetId && listed.adSetIds.has(lead.adSetId)) return "adset";
  if (lead.campaignId && listed.campaignIds.has(lead.campaignId)) return "campaign";
  return !lead.adId && !lead.adSetId && !lead.campaignId ? "unassigned_no_ids" : "unassigned_id_not_listed";
}

function bucketFor(map: Map<string, LeadBucket>, key: string): LeadBucket {
  const existing = map.get(key);
  if (existing) return existing;
  const created = createBucket();
  map.set(key, created);
  return created;
}

/**
 * Attributes every lead to the deepest listed level it carries: ad, then ad set,
 * then campaign. Each lead is counted exactly once, so the totals equal the sum of
 * the rows. A campaign's leads are every lead whose campaignId is that campaign,
 * which is the same set the Leads page's campaign filter selects. Matching is by ID
 * only, never by name.
 */
export function attributeLeadFacts(campaigns: Campaign[], leads: LeadFact[]): LeadAttribution {
  const listed = listedIdsOf(campaigns);
  const gaps: AttributionGaps = { unassigned: 0, noIds: 0, idNotListed: 0, landing: 0 };
  const attribution: LeadAttribution = {
    byAd: new Map(),
    byAdSet: new Map(),
    byCampaign: new Map(),
    unassigned: createBucket(),
    gaps,
  };

  for (const lead of leads) {
    const outcome = classifyAttribution(lead, listed);
    if (outcome === "ad" && lead.adId) {
      addLeadToBucket(bucketFor(attribution.byAd, lead.adId), lead);
    } else if (outcome === "adset" && lead.adSetId) {
      addLeadToBucket(bucketFor(attribution.byAdSet, lead.adSetId), lead);
    } else if (outcome === "campaign" && lead.campaignId) {
      addLeadToBucket(bucketFor(attribution.byCampaign, lead.campaignId), lead);
    } else {
      addLeadToBucket(attribution.unassigned, lead);
      gaps.unassigned += 1;
      if (outcome === "unassigned_no_ids") gaps.noIds += 1;
      else gaps.idNotListed += 1;
      if (lead.sourceType === "landing_page") gaps.landing += 1;
    }
  }

  return attribution;
}
