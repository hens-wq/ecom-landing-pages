import { logRawActionsForDebugging, parseLeadsFromActions } from "@/lib/advertising/meta/actions";
import type {
  MetaAdInsightsRow,
  MetaAdNode,
  MetaAdSetNode,
  MetaCampaignNode,
} from "@/lib/advertising/meta/types";
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
function mapStatus(node: { status?: string; effective_status?: string }): EntityStatus {
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
  logRawActionsForDebugging(row.ad_id, row.actions);
  return {
    spend: parseNumber(row.spend),
    impressions: parseNumber(row.impressions),
    reach: parseNumber(row.reach),
    linkClicks: parseNumber(row.inline_link_clicks),
    leads: parseLeadsFromActions(row.actions),
    // Sales-side numbers never come from Meta (see lib/advertising/internal-sales.ts) -
    // real ads always report 0 here until real sales attribution exists.
    sales: 0,
    revenue: 0,
  };
}

export function mapMetaHierarchyToCampaigns(
  campaignNodes: MetaCampaignNode[],
  adSetNodes: MetaAdSetNode[],
  adNodes: MetaAdNode[],
  insightsRows: MetaAdInsightsRow[]
): Campaign[] {
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

  return campaignNodes.map((campaignNode) => ({
    id: campaignNode.id,
    name: campaignNode.name,
    // Meta's campaign "objective" field is available but not requested in
    // Phase 2A (not in the required field list) - kept generic here.
    objective: "Meta Ads",
    status: mapStatus(campaignNode),
    adSets: adSetsByCampaignId.get(campaignNode.id) ?? [],
  }));
}
