import { leads as mockLeads } from "@/lib/mock-data/leads";
import type { LeadsDataProvider, MetaFormLead } from "@/lib/leads/types";
import type { DateRange } from "@/lib/advertising/types";

/** Adapts the existing Phase 1 mock leads (lib/mock-data/leads.ts) into the same shape real Meta leads use, filtered to the requested date range. */
export class MockLeadsProvider implements LeadsDataProvider {
  readonly source = "mock" as const;

  async getLeads(range: DateRange): Promise<MetaFormLead[]> {
    const sinceTime = new Date(`${range.since}T00:00:00Z`).getTime();
    const untilTime = new Date(`${range.until}T23:59:59Z`).getTime();

    return mockLeads
      .filter((lead) => {
        const leadTime = new Date(lead.leadDate).getTime();
        return leadTime >= sinceTime && leadTime <= untilTime;
      })
      .map(
        (lead): MetaFormLead => ({
          id: lead.id,
          createdTime: lead.leadDate,
          name: lead.name,
          phone: lead.phone,
          normalizedPhone: lead.normalizedPhone,
          email: null,
          formId: `mock-form-${lead.adId}`,
          campaignId: lead.campaignId,
          campaignName: lead.campaignName,
          adSetId: lead.adSetId,
          adSetName: lead.adSetName,
          adId: lead.adId,
          adName: lead.adName,
          sourceType: lead.sourceType,
        })
      );
  }
}
