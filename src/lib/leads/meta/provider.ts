import "server-only";

import type { DateRange } from "@/lib/advertising/types";
import { getCachedMetaLeads } from "@/lib/leads/meta/cache";
import type { LeadsDataProvider, MetaFormLead } from "@/lib/leads/types";

function toUnixSeconds(dateIso: string): number {
  return Math.floor(new Date(`${dateIso}T00:00:00Z`).getTime() / 1000);
}

/**
 * The account's full lead history is fetched (and cached) once by
 * lib/leads/meta/cache.ts - this just slices that cached snapshot down to
 * the requested date range in memory, which is why changing the range on
 * the Leads page never triggers another Meta API call on its own. See
 * cache.ts / fetch-all.ts for how the underlying data is retrieved.
 */
export class MetaLeadsProvider implements LeadsDataProvider {
  readonly source = "meta" as const;

  async getLeads(range: DateRange): Promise<MetaFormLead[]> {
    const allLeads = await getCachedMetaLeads();
    const sinceUnix = toUnixSeconds(range.since);
    const untilDate = new Date(`${range.until}T00:00:00Z`);
    untilDate.setUTCDate(untilDate.getUTCDate() + 1); // "until" is inclusive of the whole day
    const untilUnix = Math.floor(untilDate.getTime() / 1000);

    return allLeads.filter((lead) => {
      const createdUnix = Math.floor(new Date(lead.createdTime).getTime() / 1000);
      return createdUnix >= sinceUnix && createdUnix < untilUnix;
    });
  }
}
