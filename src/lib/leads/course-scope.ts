import { isExcludedCampaignId } from "@/lib/campaign-scope";

/**
 * The course-campaign rule for every export that analyses course campaigns: the 7-day agent export, the selected-range
 * XLSX, and any export added later for the course analysis. A lead whose campaign is excluded (see lib/campaign-scope)
 * never reaches those files. The lead itself is not deleted: it stays in Meta and in the database.
 */
export function isCourseLead(lead: { campaignId: string | null | undefined }): boolean {
  return !isExcludedCampaignId(lead.campaignId);
}

export function courseLeads<T extends { campaignId: string | null | undefined }>(leads: readonly T[]): T[] {
  return leads.filter((lead) => isCourseLead(lead));
}
