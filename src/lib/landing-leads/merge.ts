import type { CampaignRow } from "@/lib/aggregate";
import type { LandingLeadRecord } from "@/lib/landing-leads/types";
import type { MetaFormLead } from "@/lib/leads";

interface NameLookup {
  campaignNameById: Map<string, string>;
  adSetNameById: Map<string, string>;
  adNameById: Map<string, string>;
}

/** Built once per page load from whatever campaign/ad set/ad hierarchy the Dashboard already fetched for the same date range - reused to resolve landing-page leads' IDs into display names (see landingLeadToMetaFormLead). */
export function buildNameLookup(campaignRows: CampaignRow[]): NameLookup {
  const campaignNameById = new Map<string, string>();
  const adSetNameById = new Map<string, string>();
  const adNameById = new Map<string, string>();
  for (const campaign of campaignRows) {
    campaignNameById.set(campaign.id, campaign.name);
    for (const adSet of campaign.adSets) {
      adSetNameById.set(adSet.id, adSet.name);
      for (const ad of adSet.ads) adNameById.set(ad.id, ad.name);
    }
  }
  return { campaignNameById, adSetNameById, adNameById };
}

/**
 * Landing-page leads only ever carry attribution IDs, never names (see
 * lib/landing-leads/validation.ts) - matching this app's rule that IDs, not
 * names, are the real attribution keys. Names shown in the Leads table are
 * resolved here from whatever campaign/ad set/ad data is already loaded for
 * the same date range, falling back to the raw ID when nothing matches (a
 * paused/deleted campaign, or the landing page never captured one at all).
 */
export function landingLeadToMetaFormLead(record: LandingLeadRecord, names: NameLookup): MetaFormLead {
  const campaignId = record.campaignId ?? "";
  const adSetId = record.adSetId ?? "";
  const adId = record.adId ?? "";
  return {
    id: record.internalLeadId,
    createdTime: record.submittedAt,
    name: record.name,
    phone: record.phone,
    normalizedPhone: record.normalizedPhone,
    email: record.email,
    formId: "",
    campaignId,
    campaignName: (campaignId && names.campaignNameById.get(campaignId)) || campaignId,
    adSetId,
    adSetName: (adSetId && names.adSetNameById.get(adSetId)) || adSetId,
    adId,
    adName: (adId && names.adNameById.get(adId)) || adId,
    sourceType: "landing_page",
  };
}
