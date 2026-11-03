import "server-only";

import { buildGraphUrl, fetchAllPages, fetchNode } from "@/lib/advertising/meta/client";
import type { MetaConfig } from "@/lib/advertising/meta/config";
import { mapMetaHierarchyToCampaigns } from "@/lib/advertising/meta/mapper";
import { fetchAdNodes, fetchAdSetNodes, fetchCampaignNodes } from "@/lib/advertising/meta/nodes";
import type { MetaAdAccountNode, MetaAdInsightsRow } from "@/lib/advertising/meta/types";
import type { AdvertisingAccountInfo, AdvertisingDataProvider, AdvertisingSnapshot, DateRange } from "@/lib/advertising/types";

const INSIGHTS_PAGE_LIMIT = "500";

/** Reach at one level of the hierarchy. Meta returns the reach as a string. */
export interface MetaLevelReachRow {
  campaign_id?: string;
  adset_id?: string;
  reach?: string;
}

/** One ad's spend on one day (time_increment=1). Spend only: reach is never split by day. */
export interface MetaDailyAdInsightsRow {
  ad_id: string;
  campaign_id: string;
  spend?: string;
  date_start: string;
}

export class MetaAdvertisingProvider implements AdvertisingDataProvider {
  readonly source = "meta" as const;

  constructor(private readonly config: MetaConfig) {}

  async getAccountInfo(): Promise<AdvertisingAccountInfo | null> {
    const url = buildGraphUrl(this.config, this.config.adAccountId, { fields: "id,name,account_id" });
    const node = await fetchNode<MetaAdAccountNode>(url);
    return { id: node.account_id ?? node.id, name: node.name ?? node.id };
  }

  async getCampaigns(range: DateRange): Promise<AdvertisingSnapshot> {
    const [campaignNodes, adSetNodes, adNodes, insightsRows] = await Promise.all([
      fetchCampaignNodes(this.config),
      fetchAdSetNodes(this.config),
      fetchAdNodes(this.config),
      this.fetchAdInsights(range),
    ]);

    return mapMetaHierarchyToCampaigns(campaignNodes, adSetNodes, adNodes, insightsRows);
  }

  /**
   * Total spend for the whole account in `range`, from the account-level
   * Insights edge. Not a sum of getCampaigns(): that list comes from Meta's
   * default campaign listing, which doesn't promise to include every paused or
   * archived campaign that still spent in the range.
   */
  async getAccountSpend(range: DateRange): Promise<number> {
    const url = buildGraphUrl(this.config, `${this.config.adAccountId}/insights`, {
      level: "account",
      fields: "spend",
      time_range: JSON.stringify({ since: range.since, until: range.until }),
    });
    const rows = await fetchAllPages<{ spend?: string }>(url);
    return rows.reduce((total, row) => total + Number(row.spend ?? 0), 0);
  }

  /**
   * One row per ad for the ENTIRE requested range (no time_increment). This is
   * deliberate: Reach is a unique-user count, so summing per-day reach across a
   * time_increment=1 breakdown would double-count anyone reached on more than
   * one day. Requesting the whole range as one row gives Meta's own correct
   * period-level reach/frequency directly - matching how Ads Manager itself
   * reports a date range - at the cost of not having a daily trend for real
   * data yet (the dashboard's trend chart stays mock-only for now).
   */
  private fetchAdInsights(range: DateRange): Promise<MetaAdInsightsRow[]> {
    const url = buildGraphUrl(this.config, `${this.config.adAccountId}/insights`, {
      level: "ad",
      fields: "ad_id,adset_id,campaign_id,spend,impressions,reach,inline_link_clicks,actions",
      time_range: JSON.stringify({ since: range.since, until: range.until }),
      limit: INSIGHTS_PAGE_LIMIT,
    });
    return fetchAllPages<MetaAdInsightsRow>(url);
  }

  /**
   * Unique reach of each campaign and each ad set for the range, read at that level. Meta de-duplicates people across
   * the children itself, which a sum of ad reach never does. Read only; no write call exists in this provider.
   */
  async getLevelReach(range: DateRange): Promise<{ campaign: Map<string, number>; adset: Map<string, number> }> {
    const timeRange = JSON.stringify({ since: range.since, until: range.until });
    const [campaignRows, adSetRows] = await Promise.all([
      fetchAllPages<MetaLevelReachRow>(
        buildGraphUrl(this.config, `${this.config.adAccountId}/insights`, {
          level: "campaign",
          fields: "campaign_id,reach",
          time_range: timeRange,
          limit: INSIGHTS_PAGE_LIMIT,
        })
      ),
      fetchAllPages<MetaLevelReachRow>(
        buildGraphUrl(this.config, `${this.config.adAccountId}/insights`, {
          level: "adset",
          fields: "adset_id,reach",
          time_range: timeRange,
          limit: INSIGHTS_PAGE_LIMIT,
        })
      ),
    ]);
    return {
      campaign: new Map(campaignRows.map((row) => [row.campaign_id ?? "", Number(row.reach ?? 0)] as const)),
      adset: new Map(adSetRows.map((row) => [row.adset_id ?? "", Number(row.reach ?? 0)] as const)),
    };
  }

  /** Each ad's spend for every day of the range. Spend is additive, so the daily split adds up to the range total. */
  getDailyAdSpend(range: DateRange): Promise<MetaDailyAdInsightsRow[]> {
    const url = buildGraphUrl(this.config, `${this.config.adAccountId}/insights`, {
      level: "ad",
      fields: "ad_id,campaign_id,spend,date_start",
      time_increment: "1",
      time_range: JSON.stringify({ since: range.since, until: range.until }),
      limit: INSIGHTS_PAGE_LIMIT,
    });
    return fetchAllPages<MetaDailyAdInsightsRow>(url);
  }
}
