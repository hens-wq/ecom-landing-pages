import type { LeadSourceType } from "@/lib/types";

/**
 * A single real, individual lead captured through a Meta Instant Form (Lead
 * Ads) - this is a genuinely different data source from the aggregate
 * Insights numbers in lib/advertising/ (which only ever report a Leads
 * *count*, never the underlying person). Also different from the Phase 1
 * mock Lead type in lib/types.ts, which carries sales-attribution fields
 * (saleStatus/saleDate/timeToSale*) that don't belong here - this phase is
 * lead capture only, no sales attribution yet.
 *
 * IDs (campaignId/adSetId/adId/formId) are always the real attribution keys,
 * exactly as returned by Meta on the lead object itself - never derived from
 * names.
 */
export interface MetaFormLead {
  id: string;
  createdTime: string; // full ISO datetime
  name: string | null;
  phone: string | null;
  normalizedPhone: string | null;
  email: string | null;
  formId: string;
  campaignId: string;
  campaignName: string;
  adSetId: string;
  adSetName: string;
  adId: string;
  adName: string;
  /**
   * The Marketing API's leadgen objects don't expose whether the form was
   * "standard" or "rich" without an extra per-form call (fetching each
   * form's context_card) - out of scope for this phase, same simplification
   * as Ad.destinationType in lib/advertising. "unknown" is the honest answer.
   */
  sourceType: LeadSourceType;
}

export type LeadsSource = "mock" | "meta";

export interface LeadsResult {
  source: LeadsSource;
  leads: MetaFormLead[];
}

export interface LeadsDataProvider {
  readonly source: LeadsSource;
  getLeads(range: { since: string; until: string }): Promise<MetaFormLead[]>;
}
