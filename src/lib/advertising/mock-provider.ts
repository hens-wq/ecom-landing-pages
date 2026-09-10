import { campaigns as mockCampaigns } from "@/lib/mock-data/campaigns";
import { scaleRawMetrics } from "@/lib/calculations";
import { dateRangeDayCount } from "@/lib/advertising/date-range";
import type { AdvertisingAccountInfo, AdvertisingDataProvider, DateRange } from "@/lib/advertising/types";
import type { Campaign } from "@/lib/types";

const BASELINE_DAYS = 30;

/**
 * Phase 1 behavior, unchanged: the mock dataset is authored as a 30-day
 * baseline, and a requested date range scales every ad's raw metrics
 * proportionally by day count. This used to happen inside the dashboard page
 * itself; it now lives here so the page never needs to know whether it's
 * talking to mock or real data - both providers just return a `Campaign[]` for
 * a given range.
 */
export class MockAdvertisingProvider implements AdvertisingDataProvider {
  readonly source = "mock" as const;

  async getCampaigns(range: DateRange): Promise<Campaign[]> {
    const scale = dateRangeDayCount(range) / BASELINE_DAYS;

    return mockCampaigns.map((campaign) => ({
      ...campaign,
      adSets: campaign.adSets.map((adSet) => ({
        ...adSet,
        ads: adSet.ads.map((ad) => ({
          ...ad,
          metrics: scaleRawMetrics(ad.metrics, scale),
        })),
      })),
    }));
  }

  async getAccountInfo(): Promise<AdvertisingAccountInfo | null> {
    // No real account behind mock data - the Integrations page reads this as "not configured".
    return null;
  }
}
