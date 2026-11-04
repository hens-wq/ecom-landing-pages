import { campaigns as mockCampaigns } from "@/lib/mock-data/campaigns";
import { scaleRawMetrics } from "@/lib/calculations";
import { dateRangeDayCount } from "@/lib/advertising/date-range";
import type { AdvertisingAccountInfo, AdvertisingDataProvider, AdvertisingSnapshot, DateRange } from "@/lib/advertising/types";
import { isExcludedCampaignId } from "@/lib/campaign-scope";
import type { Campaign, LevelReach } from "@/lib/types";

const BASELINE_DAYS = 30;

/**
 * Demo only. A fixed frequency for one campaign, ad set or the course total, so each synthetic parent reach has its own
 * basis. It is never built from the reach of the children.
 */
function demoFrequency(key: string): number {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) % 100_003;
  return 1.4 + (hash % 150) / 100;
}

/**
 * Demo only. Impressions divided by the fixed frequency, kept between two bounds: never below the largest child's reach
 * (a parent reaches at least as many people as any one child) and never above the impressions themselves.
 */
function demoParentReach(key: string, impressions: number, largestChildReach: number): number {
  if (impressions === 0) return 0;
  return Math.min(impressions, Math.max(largestChildReach, Math.round(impressions / demoFrequency(key))));
}

/**
 * Phase 1 behavior, unchanged: the mock dataset is authored as a 30-day
 * baseline, and a requested date range scales every ad's raw metrics
 * proportionally by day count. This used to happen inside the dashboard page
 * itself; it now lives here so the page never needs to know whether it's
 * talking to mock or real data - both providers just return a snapshot for a
 * given range.
 */
export class MockAdvertisingProvider implements AdvertisingDataProvider {
  readonly source = "mock" as const;

  async getCampaigns(range: DateRange): Promise<AdvertisingSnapshot> {
    const scale = dateRangeDayCount(range) / BASELINE_DAYS;

    const all: Campaign[] = mockCampaigns.map((campaign) => ({
      ...campaign,
      adSets: campaign.adSets.map((adSet) => ({
        ...adSet,
        ads: adSet.ads.map((ad) => ({
          ...ad,
          metrics: scaleRawMetrics(ad.metrics, scale),
        })),
      })),
    }));

    const campaigns = all.filter((campaign) => !isExcludedCampaignId(campaign.id));
    const excludedCampaigns = all.filter((campaign) => isExcludedCampaignId(campaign.id));
    const excludedSpend = excludedCampaigns.reduce(
      (total, campaign) => total + campaign.adSets.reduce((adSetTotal, adSet) => adSetTotal + adSet.ads.reduce((adTotal, ad) => adTotal + ad.metrics.spend, 0), 0),
      0
    );
    return { campaigns, unlisted: null, excludedCampaigns, excludedSpend };
  }

  async getAccountInfo(): Promise<AdvertisingAccountInfo | null> {
    // No real account behind mock data - the Integrations page reads this as "not configured".
    return null;
  }

  /**
   * Demo only: a synthetic reach for each campaign and each ad set (see demoParentReach). The listing already leaves out
   * the excluded campaigns, so no excluded id is needed here.
   */
  async getLevelReach(range: DateRange): Promise<LevelReach> {
    const { campaigns } = await this.getCampaigns(range);
    const levels: LevelReach = { campaign: {}, adset: {} };
    for (const campaign of campaigns) {
      let campaignImpressions = 0;
      let largestAdSetReach = 0;
      for (const adSet of campaign.adSets) {
        let adSetImpressions = 0;
        let largestAdReach = 0;
        for (const ad of adSet.ads) {
          adSetImpressions += ad.metrics.impressions;
          largestAdReach = Math.max(largestAdReach, ad.metrics.reach ?? 0);
        }
        const adSetReach = demoParentReach(adSet.id, adSetImpressions, largestAdReach);
        levels.adset[adSet.id] = adSetReach;
        campaignImpressions += adSetImpressions;
        largestAdSetReach = Math.max(largestAdSetReach, adSetReach);
      }
      levels.campaign[campaign.id] = demoParentReach(campaign.id, campaignImpressions, largestAdSetReach);
    }
    return levels;
  }

  /** Demo only: a synthetic course total reach, bounded the same way as the campaign levels. */
  async getCourseReach(range: DateRange): Promise<number> {
    const [{ campaigns }, levels] = await Promise.all([this.getCampaigns(range), this.getLevelReach(range)]);
    let impressions = 0;
    let largestCampaignReach = 0;
    for (const campaign of campaigns) {
      for (const adSet of campaign.adSets) {
        for (const ad of adSet.ads) impressions += ad.metrics.impressions;
      }
      largestCampaignReach = Math.max(largestCampaignReach, levels.campaign[campaign.id] ?? 0);
    }
    return demoParentReach("course", impressions, largestCampaignReach);
  }
}
