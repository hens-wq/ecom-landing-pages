import "server-only";

import { buildGraphUrl, fetchAllPages } from "@/lib/advertising/meta/client";
import type { MetaConfig } from "@/lib/advertising/meta/config";
import type { MetaAdNode, MetaAdSetNode, MetaCampaignNode } from "@/lib/advertising/meta/types";

const LIST_PAGE_LIMIT = "200";

/**
 * Structure-only fetchers (campaign/adset/ad nodes, no performance numbers),
 * shared between the advertising provider (meta/provider.ts, which joins them
 * with Insights) and the leads provider (leads/meta/provider.ts, which only
 * needs the ad ID list to know which ads to query for leads).
 */

export function fetchCampaignNodes(config: MetaConfig): Promise<MetaCampaignNode[]> {
  const url = buildGraphUrl(config, `${config.adAccountId}/campaigns`, {
    fields: "id,name,status,effective_status",
    limit: LIST_PAGE_LIMIT,
  });
  return fetchAllPages<MetaCampaignNode>(url);
}

export function fetchAdSetNodes(config: MetaConfig): Promise<MetaAdSetNode[]> {
  const url = buildGraphUrl(config, `${config.adAccountId}/adsets`, {
    fields: "id,name,campaign_id,status,effective_status",
    limit: LIST_PAGE_LIMIT,
  });
  return fetchAllPages<MetaAdSetNode>(url);
}

export function fetchAdNodes(config: MetaConfig): Promise<MetaAdNode[]> {
  const url = buildGraphUrl(config, `${config.adAccountId}/ads`, {
    fields: "id,name,adset_id,campaign_id,status,effective_status",
    limit: LIST_PAGE_LIMIT,
  });
  return fetchAllPages<MetaAdNode>(url);
}
