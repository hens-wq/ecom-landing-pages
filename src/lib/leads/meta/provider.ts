import "server-only";

import { buildGraphUrl, fetchAllPages } from "@/lib/advertising/meta/client";
import type { MetaConfig } from "@/lib/advertising/meta/config";
import { fetchAdNodes } from "@/lib/advertising/meta/nodes";
import { AdvertisingApiError, type DateRange } from "@/lib/advertising/types";
import { mapMetaLeadgenNode } from "@/lib/leads/meta/mapper";
import type { MetaLeadgenNode } from "@/lib/leads/meta/types";
import type { LeadsDataProvider, MetaFormLead } from "@/lib/leads/types";

const LEADS_PAGE_LIMIT = "200";
/** How many ads to query for leads at once - keeps this well under Meta's rate limits on larger accounts. */
const CONCURRENCY = 5;

const LEAD_FIELDS = "id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,field_data";

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

function toUnixSeconds(dateIso: string): number {
  return Math.floor(new Date(`${dateIso}T00:00:00Z`).getTime() / 1000);
}

/** Ad ID only, no personal data - safe to log unconditionally when an ad's leads can't be fetched (e.g. it has no lead form at all). */
function logLeadsFetchFailure(adId: string, error: unknown): void {
  const code = error instanceof AdvertisingApiError ? error.code : "unknown_error";
  console.warn(`[meta leads] ad ${adId}: skipped (${code})`);
}

/**
 * Individual Instant Form leads, retrieved per-ad via GET /{ad_id}/leads
 * (requires the leads_retrieval permission). There is no single "all leads
 * for this ad account" endpoint, so every ad the account has is queried -
 * most return an empty list immediately (any ad that isn't a Lead Ad, or
 * whose form has zero submissions).
 *
 * Deliberately does NOT send a server-side date filter to Meta: the exact
 * `filtering` operator semantics for the leads edge couldn't be verified live
 * from the environment this was built in (see PR notes), and a wrong filter
 * that Meta rejects would silently zero out every ad's results. Instead, all
 * leads for each ad are fetched (paginated) and then filtered by
 * `created_time` here - slower for an account with a very long lead history,
 * but correct by construction regardless of any assumption about Meta's
 * filter syntax. A verified server-side filter would be a safe follow-up
 * optimization once checked against a real account's results.
 */
export class MetaLeadsProvider implements LeadsDataProvider {
  readonly source = "meta" as const;

  constructor(private readonly config: MetaConfig) {}

  async getLeads(range: DateRange): Promise<MetaFormLead[]> {
    const adNodes = await fetchAdNodes(this.config);
    const sinceUnix = toUnixSeconds(range.since);
    const untilDate = new Date(`${range.until}T00:00:00Z`);
    untilDate.setUTCDate(untilDate.getUTCDate() + 1); // "until" is inclusive of the whole day
    const untilUnix = Math.floor(untilDate.getTime() / 1000);

    const perAdResults = await mapWithConcurrency(adNodes, CONCURRENCY, async (adNode) => {
      try {
        return await this.fetchLeadsForAd(adNode.id);
      } catch (error) {
        logLeadsFetchFailure(adNode.id, error);
        return [];
      }
    });

    return perAdResults
      .flat()
      .map(mapMetaLeadgenNode)
      .filter((lead) => {
        const createdUnix = Math.floor(new Date(lead.createdTime).getTime() / 1000);
        return createdUnix >= sinceUnix && createdUnix < untilUnix;
      });
  }

  private fetchLeadsForAd(adId: string): Promise<MetaLeadgenNode[]> {
    const url = buildGraphUrl(this.config, `${adId}/leads`, {
      fields: LEAD_FIELDS,
      limit: LEADS_PAGE_LIMIT,
    });
    return fetchAllPages<MetaLeadgenNode>(url);
  }
}
