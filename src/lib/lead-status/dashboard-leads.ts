import "server-only";

import { isoDateInTimezone } from "@/lib/advertising/timezone";
import { getLandingLeadsInRange } from "@/lib/landing-leads/repository";
import { getLeadsData } from "@/lib/leads";
import type { DashboardLeadIndex, DashboardLeadInfo } from "@/lib/lead-status/crm-sync";

/** Early enough to reach any lead this dashboard has ever stored. */
const ALL_TIME_SINCE = "2010-01-01";

/**
 * Every lead the dashboard knows, across all dates: Meta Instant Form leads
 * (live, from the same cache the Leads page uses) and landing-page leads
 * (Neon). Meta being unavailable doesn't fail the whole index - it's reported
 * as metaAvailable: false so callers can say so.
 */
export async function loadDashboardLeadIndex(): Promise<DashboardLeadIndex> {
  const today = isoDateInTimezone(new Date());
  const byId = new Map<string, DashboardLeadInfo>();

  let metaAvailable = true;
  try {
    const meta = await getLeadsData({ since: ALL_TIME_SINCE, until: today });
    for (const lead of meta.leads) {
      byId.set(lead.id, {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        normalizedPhone: lead.normalizedPhone,
        createdDate: isoDateInTimezone(new Date(lead.createdTime)),
      });
    }
  } catch {
    metaAvailable = false;
  }

  const landing = await getLandingLeadsInRange(ALL_TIME_SINCE, today);
  for (const record of landing) {
    byId.set(record.internalLeadId, {
      id: record.internalLeadId,
      name: record.name,
      phone: record.phone,
      normalizedPhone: record.normalizedPhone,
      createdDate: isoDateInTimezone(new Date(record.submittedAt)),
    });
  }

  return { byId, metaAvailable };
}
