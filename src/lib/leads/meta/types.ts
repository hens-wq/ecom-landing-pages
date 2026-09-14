/** Raw Meta Graph API shapes for the leadgen (Instant Form lead) domain. Never imported outside leads/meta/*. */

export interface MetaFieldDataEntry {
  name: string;
  values: string[];
}

export interface MetaLeadgenNode {
  id: string;
  created_time: string;
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  form_id?: string;
  field_data?: MetaFieldDataEntry[];
}
