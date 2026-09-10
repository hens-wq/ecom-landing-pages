import "server-only";

import { buildGraphUrl, fetchAllPages, fetchNode } from "@/lib/advertising/meta/client";
import type { MetaConfig } from "@/lib/advertising/meta/config";
import { mapMetaHierarchyToCampaigns } from "@/lib/advertising/meta/mapper";
import type {
  MetaAdAccountNode,
  MetaAdInsightsRow,
  MetaAdNode,
  MetaAdSetNode,
  MetaCampaignNode,
} from "@/lib/advertising/meta/types";
import type { AdvertisingAccountInfo, AdvertisingDataProvider, DateRange } from "@/lib/advertising/types";
import type { Campaign } from "@/lib/types";

const LIST_PAGE_LIMIT = "200";
const INSIGHTS_PAGE_LIMIT = "500";

export class MetaAdvertisingProvider implements AdvertisingDataProvider {
  readonly source = "meta" as const;

  constructor(private readonly config: MetaConfig) {}

  async getAccountInfo(): Promise<AdvertisingAccountInfo | null> {
    const url = buildGraphUrl(this.config, this.config.adAccountId, { fields: "id,name,account_id" });
    const node = await fetchNode<MetaAdAccountNode>(url);
    return { id: node.account_id ?? node.id, name: node.name ?? node.id };
  }

  async getCampaigns(range: DateRange): Promise<Campaign[]> {
    const [campaignNodes, adSetNodes, adNodes, insightsRows] = await Promise.all([
      this.fetchCampaignNodes(),
      this.fetchAdSetNodes(),
      this.fetchAdNodes(),
      this.fetchAdInsights(range),
    ]);

    return mapMetaHierarchyToCampaigns(campaignNodes, adSetNodes, adNodes, insightsRows);
  }

  private fetchCampaignNodes(): Promise<MetaCampaignNode[]> {
    const url = buildGraphUrl(this.config, `${this.config.adAccountId}/campaigns`, {
      fields: "id,name,status,effective_status",
      limit: LIST_PAGE_LIMIT,
    });
    return fetchAllPages<MetaCampaignNode>(url);
  }

  private fetchAdSetNodes(): Promise<MetaAdSetNode[]> {
    const url = buildGraphUrl(this.config, `${this.config.adAccountId}/adsets`, {
      fields: "id,name,campaign_id,status,effective_status",
      limit: LIST_PAGE_LIMIT,
    });
    return fetchAllPages<MetaAdSetNode>(url);
  }

  private fetchAdNodes(): Promise<MetaAdNode[]> {
    const url = buildGraphUrl(this.config, `${this.config.adAccountId}/ads`, {
      fields: "id,name,adset_id,campaign_id,status,effective_status",
      limit: LIST_PAGE_LIMIT,
    });
    return fetchAllPages<MetaAdNode>(url);
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
}
