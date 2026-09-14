import "server-only";

import { startOfDayUnixMs } from "@/lib/advertising/timezone";
import type { DateRange } from "@/lib/advertising/types";
import { getCachedMetaLeads } from "@/lib/leads/meta/cache";
import type { LeadsDataProvider, MetaFormLead } from "@/lib/leads/types";

/** Calendar-date-string arithmetic only, not a real instant - see startOfDayUnixMs for the timezone-aware conversion to an actual UTC boundary. */
function nextCalendarDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** Window boundaries and result count only, never personal data - gated behind META_DEBUG_ACTIONS=1. Use this to confirm the exact UTC instants "today" resolves to matches Ads Manager's own Israel-time "Today" window. */
function logDateFilterWindow(range: DateRange, sinceMs: number, untilMs: number, matchedCount: number, totalCount: number): void {
  if (process.env.META_DEBUG_ACTIONS !== "1") return;
  console.log(
    `[meta leads] range ${range.since}..${range.until} -> window [${new Date(sinceMs).toISOString()}, ${new Date(untilMs).toISOString()}) matched ${matchedCount}/${totalCount} cached leads`
  );
}

/**
 * The account's full lead history is fetched (and cached) once by
 * lib/leads/meta/cache.ts - this just slices that cached snapshot down to
 * the requested date range in memory, which is why changing the range on
 * the Leads page never triggers another Meta API call on its own. See
 * cache.ts / fetch-all.ts for how the underlying data is retrieved.
 *
 * The since/until boundaries are resolved to real UTC instants via
 * REPORTING_TIMEZONE (see lib/advertising/timezone.ts), not naive UTC
 * midnight - "Today" needs to mean the same 00:00-24:00 Israel-time window
 * Ads Manager uses, not 00:00-24:00 UTC, or leads created in the 2-3 hour
 * gap between the two clocks would be dropped or wrongly included.
 */
export class MetaLeadsProvider implements LeadsDataProvider {
  readonly source = "meta" as const;

  async getLeads(range: DateRange): Promise<MetaFormLead[]> {
    const allLeads = await getCachedMetaLeads();
    const sinceMs = startOfDayUnixMs(range.since);
    const untilMs = startOfDayUnixMs(nextCalendarDate(range.until)); // "until" is inclusive of its whole day

    const matched = allLeads.filter((lead) => {
      const createdMs = new Date(lead.createdTime).getTime();
      return createdMs >= sinceMs && createdMs < untilMs;
    });
    logDateFilterWindow(range, sinceMs, untilMs, matched.length, allLeads.length);
    return matched;
  }
}
