import { EXCLUDED_CAMPAIGNS, createCampaignScope, isExcludedCampaign, type ExcludedCampaign } from "@/lib/campaign-scope";

interface CourseLeadScope {
  campaignId: string | null | undefined;
  campaignName?: string | null;
}

/** Recruitment records stay in their sources but never enter course-analysis views or exports. */
export function isCourseLead(lead: CourseLeadScope): boolean {
  return !isExcludedCampaign(lead.campaignId, lead.campaignName);
}

/** A live snapshot also identifies newly named recruiters whose landing leads carry only a campaign ID. */
export function courseLeads<T extends CourseLeadScope>(leads: readonly T[], snapshotExclusions: readonly ExcludedCampaign[] = []): T[] {
  const scope = createCampaignScope([...EXCLUDED_CAMPAIGNS, ...snapshotExclusions]);
  return leads.filter((lead) => !scope.isExcluded(lead.campaignId, lead.campaignName));
}
