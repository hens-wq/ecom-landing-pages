import { logLeadParsingForDebugging, parseLeadsFromActions } from "@/lib/advertising/meta/actions";
import type {
  MetaAdInsightsRow,
  MetaAdNode,
  MetaAdSetNode,
  MetaCampaignNode,
} from "@/lib/advertising/meta/types";
import type { AdvertisingSnapshot } from "@/lib/advertising/types";
import { COURSE_SCOPE, type CampaignScope } from "@/lib/campaign-scope";
import type { Ad, AdSet, Campaign, EntityStatus, RawMetrics } from "@/lib/types";

/**
 * Meta's response shapes never leak past this file - every function here takes
 * raw Meta nodes and returns the same internal Campaign/AdSet/Ad/RawMetrics
 * types the mock provider produces, so nothing downstream (aggregate.ts, every
 * dashboard component) needs to know or care that the data came from a live
 * API call instead of mock-data/campaigns.ts.
 */

const ZERO_METRICS: RawMetrics = { spend: 0, impressions: 0, reach: 0, linkClicks: 0, leads: 0, sales: 0, revenue: 0 };

/**
 * Meta's effective_status has many more values than our EntityStatus (ACTIVE,
 * PAUSED, DELETED, ARCHIVED, PENDING_REVIEW, DISAPPROVED, CAMPAIGN_PAUSED,
 * ADSET_PAUSED, WITH_ISSUES, IN_PROCESS, ...). Anything containing "PAUSED"
 * folds into "paused"; anything not "ACTIVE" or paused-like folds into "ended"
 * (closest existing bucket - Phase 1 error/review states aren't modeled yet).
 */
export function mapStatus(node: { status?: string; effective_status?: string }): EntityStatus {
  const raw = (node.effective_status ?? node.status ?? "").toUpperCase();
  if (raw === "ACTIVE") return "active";
  if (raw.includes("PAUSED")) return "paused";
  return "ended";
}

function parseNumber(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function insightsRowToRawMetrics(row: MetaAdInsightsRow): RawMetrics {
  const leadResult = parseLeadsFromActions(row.actions);
  logLeadParsingForDebugging(row.ad_id, leadResult);
  return {
    spend: parseNumber(row.spend),
    impressions: parseNumber(row.impressions),
    reach: parseNumber(row.reach),
    linkClicks: parseNumber(row.inline_link_clicks),
    leads: leadResult.leads,
    // Sales-side numbers never come from Meta. They come from the lead data
    // (see lib/performance), so this is always 0 here.
    sales: 0,
    revenue: 0,
  };
}

/**
 * Delivery of every insights row whose ad is not in the listed tree. Their spend still counts toward the account total,
 * so they are kept as one unlisted figure. Only Meta's delivery numbers are read here, never its lead counts.
 */
function unlistedDelivery(insightsRows: MetaAdInsightsRow[], treeAdIds: ReadonlySet<string>, scope: CampaignScope): RawMetrics | null {
  const total: RawMetrics = { ...ZERO_METRICS };
  let count = 0;
  for (const row of insightsRows) {
    if (treeAdIds.has(row.ad_id) || scope.isExcluded(row.campaign_id)) continue;
    count += 1;
    total.spend += parseNumber(row.spend);
    total.impressions += parseNumber(row.impressions);
    total.reach += parseNumber(row.reach);
    total.linkClicks += parseNumber(row.inline_link_clicks);
  }
  return count === 0 ? null : total;
}

/**
 * Spend of excluded campaigns' ads that the listing did not return. Those ads are not in the tree, so they are counted only
 * here. The spend of an excluded campaign's listed ads is counted from the tree itself.
 */
function excludedDelivery(insightsRows: MetaAdInsightsRow[], treeAdIds: ReadonlySet<string>, scope: CampaignScope): number {
  let total = 0;
  for (const row of insightsRows) {
    if (!treeAdIds.has(row.ad_id) && scope.isExcluded(row.campaign_id)) total += parseNumber(row.spend);
  }
  return total;
}

export function mapMetaHierarchyToCampaigns(
  campaignNodes: MetaCampaignNode[],
  adSetNodes: MetaAdSetNode[],
  adNodes: MetaAdNode[],
  insightsRows: MetaAdInsightsRow[],
  scope: CampaignScope = COURSE_SCOPE
): AdvertisingSnapshot {
  const metricsByAdId = new Map<string, RawMetrics>();
  for (const row of insightsRows) {
    metricsByAdId.set(row.ad_id, insightsRowToRawMetrics(row));
  }

  const adsByAdSetId = new Map<string, Ad[]>();
  for (const adNode of adNodes) {
    const ad: Ad = {
      id: adNode.id,
      name: adNode.name,
      adSetId: adNode.adset_id,
      status: mapStatus(adNode),
      // The Marketing API's campaign/adset/ad endpoints don't expose form
      // richness without extra per-ad creative calls (out of scope for
      // Phase 2A) - "unknown" is the honest answer rather than a guess.
      destinationType: "unknown",
      metrics: metricsByAdId.get(adNode.id) ?? ZERO_METRICS,
    };
    const bucket = adsByAdSetId.get(ad.adSetId) ?? [];
    bucket.push(ad);
    adsByAdSetId.set(ad.adSetId, bucket);
  }

  const adSetsByCampaignId = new Map<string, AdSet[]>();
  for (const adSetNode of adSetNodes) {
    const adSet: AdSet = {
      id: adSetNode.id,
      name: adSetNode.name,
      campaignId: adSetNode.campaign_id,
      status: mapStatus(adSetNode),
      ads: adsByAdSetId.get(adSetNode.id) ?? [],
    };
    const bucket = adSetsByCampaignId.get(adSet.campaignId) ?? [];
    bucket.push(adSet);
    adSetsByCampaignId.set(adSet.campaignId, bucket);
  }

  const allCampaigns: Campaign[] = campaignNodes.map((campaignNode) => ({
    id: campaignNode.id,
    name: campaignNode.name,
    // Meta's campaign "objective" field is available but not requested in
    // Phase 2A (not in the required field list) - kept generic here.
    objective: "Meta Ads",
    status: mapStatus(campaignNode),
    adSets: adSetsByCampaignId.get(campaignNode.id) ?? [],
  }));
  // Course campaigns feed every course figure. Excluded campaigns keep their data, but nothing course-related reads it.
  const campaigns = allCampaigns.filter((campaign) => !scope.isExcluded(campaign.id));
  const excludedCampaigns = allCampaigns.filter((campaign) => scope.isExcluded(campaign.id));

  // An insights row is "unlisted" when its ad did not survive into the tree: a missing ad, a missing ad set, or a missing campaign.
  const treeAdIds = new Set<string>();
  for (const campaign of allCampaigns) {
    for (const adSet of campaign.adSets) {
      for (const ad of adSet.ads) treeAdIds.add(ad.id);
    }
  }

  const excludedTreeSpend = excludedCampaigns.reduce(
    (total, campaign) =>
      total + campaign.adSets.reduce((adSetTotal, adSet) => adSetTotal + adSet.ads.reduce((adTotal, ad) => adTotal + ad.metrics.spend, 0), 0),
    0
  );
  return {
    campaigns,
    excludedCampaigns,
    unlisted: unlistedDelivery(insightsRows, treeAdIds, scope),
    excludedSpend: excludedTreeSpend + excludedDelivery(insightsRows, treeAdIds, scope),
  };
}
