/**
 * A source-aware, canonical lead record - deliberately separate from
 * MetaFormLead (lib/leads/types.ts), which stays exactly what it always was:
 * a live, unpersisted read from Meta's Instant Form API. This table is the
 * other half of "combine Meta Instant Form leads and Landing Page leads into
 * the existing Leads page": Meta leads keep being fetched live (unchanged),
 * landing-page leads are the only rows ever written here in this phase - the
 * schema's `lead_source` CHECK constraint also allows the two Meta form
 * values (see db.ts) so a future phase can persist Meta-sourced rows into
 * this same table without a migration, not because this phase writes them.
 *
 * IDs (campaignId/adSetId/adId) are always the real Meta attribution keys
 * from the landing page's own URL parameters - never derived from names,
 * matching every other attribution join in this app.
 */

export interface LandingLeadInput {
  name: string;
  phone: string;
  email?: string | null;
  /** ISO datetime the visitor actually submitted the form, if the caller has it - falls back to the moment this API receives the request. */
  submittedAt?: string | null;
  landingPageUrl?: string | null;
  campaignId?: string | null;
  adSetId?: string | null;
  adId?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  fbclid?: string | null;
  placement?: string | null;
  siteSource?: string | null;
}

export interface LandingLeadRecord {
  internalLeadId: string;
  leadSource: "landing_page";
  metaLeadId: string | null;
  createdAt: string;
  submittedAt: string;
  name: string | null;
  phone: string | null;
  normalizedPhone: string | null;
  email: string | null;
  campaignId: string | null;
  adSetId: string | null;
  adId: string | null;
  landingPageUrl: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  fbclid: string | null;
  placement: string | null;
  siteSource: string | null;
}
