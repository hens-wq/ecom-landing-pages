/**
 * Raw Meta Graph API response shapes. Nothing outside meta/mapper.ts and
 * meta/provider.ts should ever import from this file - if a component needs
 * one of these fields, the mapper should be translating it into the internal
 * Campaign/AdSet/Ad/RawMetrics model instead.
 */

export interface MetaPaging {
  cursors?: { before?: string; after?: string };
  next?: string;
  previous?: string;
}

export interface MetaListResponse<T> {
  data: T[];
  paging?: MetaPaging;
}

export interface MetaErrorBody {
  error: {
    message: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export interface MetaCampaignNode {
  id: string;
  name: string;
  status?: string;
  effective_status?: string;
}

export interface MetaAdSetNode {
  id: string;
  name: string;
  campaign_id: string;
  status?: string;
  effective_status?: string;
}

export interface MetaAdNode {
  id: string;
  name: string;
  adset_id: string;
  campaign_id: string;
  status?: string;
  effective_status?: string;
}

export interface MetaActionEntry {
  action_type: string;
  value: string;
}

/** One row per ad for the whole requested date range (no time_increment - see meta/provider.ts for why). */
export interface MetaAdInsightsRow {
  ad_id: string;
  adset_id?: string;
  campaign_id?: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  inline_link_clicks?: string;
  actions?: MetaActionEntry[];
}

export interface MetaAdAccountNode {
  id: string; // "act_<numbers>"
  name?: string;
  account_id?: string; // bare numeric id, without "act_"
}
