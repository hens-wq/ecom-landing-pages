import "server-only";

import { buildGraphUrl, fetchAllPages } from "@/lib/advertising/meta/client";
import type { MetaConfig } from "@/lib/advertising/meta/config";
import { AdvertisingApiError } from "@/lib/advertising/types";
import { mapMetaLeadgenNode } from "@/lib/leads/meta/mapper";
import type { MetaLeadgenNode } from "@/lib/leads/meta/types";
import type { MetaFormLead } from "@/lib/leads/types";

const AD_LIST_PAGE_LIMIT = "200";
/** Leads embedded per ad in the same response as the ad list itself (Graph API field expansion). Most ads never come close to this, so in practice this alone eliminates the old "one call per ad" pattern almost entirely. */
const LEADS_PER_AD_LIMIT = "100";
/** How many ads with >100 leads to page through in parallel - rare in practice, kept low to stay well under Meta's rate limits even in the worst case. */
const OVERFLOW_CONCURRENCY = 5;

const LEAD_FIELDS = "id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,field_data";

/**
 * Every non-deleted ad status Meta defines, requested explicitly rather than
 * relying on whatever the `/ads` edge's undocumented default filtering is -
 * a lead submitted while its ad was still active must still show up today
 * even if that ad has since been paused or archived. DELETED ads genuinely
 * can't be fetched via this edge at all, so that's the only status left out.
 */
const AD_EFFECTIVE_STATUSES = [
  "ACTIVE",
  "PAUSED",
  "PENDING_REVIEW",
  "DISAPPROVED",
  "PREAPPROVED",
  "PENDING_BILLING_INFO",
  "CAMPAIGN_PAUSED",
  "ARCHIVED",
  "ADSET_PAUSED",
  "IN_PROCESS",
  "WITH_ISSUES",
];

interface MetaAdWithEmbeddedLeads {
  id: string;
  leads?: { data: MetaLeadgenNode[]; paging?: { next?: string } };
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const current = cursor++;
      results[current] = await fn(items[current]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Ad ID only, never personal data - safe to log unconditionally. */
function logOverflowFetchFailure(adId: string, error: unknown): void {
  const code = error instanceof AdvertisingApiError ? error.code : "unknown_error";
  console.warn(`[meta leads] ad ${adId}: overflow lead page fetch failed (${code})`);
}

/** Counts only, never personal data - gated behind META_DEBUG_ACTIONS=1 (the same flag actions.ts uses) so it's opt-in, not noise in every deploy's logs. Use this to check completeness: does adCount match the account's real ad count in Ads Manager, and does totalLeadNodes look right relative to what Ads Manager shows for the account's whole history. */
function logFetchSummary(adCount: number, overflowAdCount: number, totalLeadNodes: number): void {
  if (process.env.META_DEBUG_ACTIONS !== "1") return;
  console.log(`[meta leads] fetched ${adCount} ads (${overflowAdCount} needed overflow paging), ${totalLeadNodes} lead records total (all-time, unfiltered by date)`);
}

/**
 * Fetches every Instant Form lead for the whole ad account in as few Meta API
 * calls as possible, using Graph API field expansion to embed each ad's
 * leads directly in the ad-list response instead of the old "list every ad,
 * then GET /{ad_id}/leads once per ad" pattern:
 *
 *   GET /{ad_account_id}/ads?fields=id,leads.limit(100){...}&limit=200
 *
 * For an account with <=200 ads and no single ad with more than 100 leads,
 * this is ONE Meta API call for the entire account's lead history (only
 * paging further if there are more than 200 ads). Only ads that actually
 * have more than 100 leads need a follow-up call to page through the rest
 * of their `leads` connection - rare for Lead Ads in practice, and handled
 * with bounded concurrency below.
 *
 * This is NOT date-filtered on Meta's side - same reasoning as before, the
 * `filtering` operator's exact semantics for this edge were never verified
 * live. The result is the account's full lead history; MetaLeadsProvider
 * filters it by date range in memory. That's intentional here: it's what
 * lets the result be cached once (see cache.ts) and reused for every date
 * range the user picks, instead of re-fetched from Meta per range - which
 * was the actual cause of the rate-limit bug this replaces.
 *
 * NOTE: the `leads.limit(100){...}` field-expansion syntax is standard,
 * long-documented Graph API behavior, but - like the rest of this
 * integration - could not be verified against a live account from the
 * sandbox this was built in (graph.facebook.com is network-blocked there).
 * If Meta rejects this specific field shape, the account owner will see a
 * clear `api_error` with Meta's own message - never silent or empty data.
 */
export async function fetchAllLeadsFromMeta(config: MetaConfig): Promise<MetaFormLead[]> {
  const url = buildGraphUrl(config, `${config.adAccountId}/ads`, {
    fields: `id,leads.limit(${LEADS_PER_AD_LIMIT}){${LEAD_FIELDS}}`,
    effective_status: JSON.stringify(AD_EFFECTIVE_STATUSES),
    limit: AD_LIST_PAGE_LIMIT,
  });
  const adNodes = await fetchAllPages<MetaAdWithEmbeddedLeads>(url);

  const leadNodes: MetaLeadgenNode[] = [];
  const overflowAds: MetaAdWithEmbeddedLeads[] = [];

  for (const ad of adNodes) {
    if (ad.leads?.data) leadNodes.push(...ad.leads.data);
    if (ad.leads?.paging?.next) overflowAds.push(ad);
  }

  if (overflowAds.length > 0) {
    const overflowResults = await mapWithConcurrency(overflowAds, OVERFLOW_CONCURRENCY, async (ad) => {
      try {
        return await fetchAllPages<MetaLeadgenNode>(ad.leads!.paging!.next!);
      } catch (error) {
        logOverflowFetchFailure(ad.id, error);
        return [];
      }
    });
    leadNodes.push(...overflowResults.flat());
  }

  logFetchSummary(adNodes.length, overflowAds.length, leadNodes.length);
  return leadNodes.map(mapMetaLeadgenNode);
}
