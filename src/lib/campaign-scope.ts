/**
 * Campaigns that are not course campaigns. They are left out of every analysis figure: spend, leads, CPL, Qualified CPL,
 * sales, close rate, cost per registration, revenue and the irrelevant lead rate. The optimization engine (stage 2) must
 * read this same list.
 *
 * Only a VERIFIED Meta campaign ID belongs here. Campaigns are never matched by name. Leaving a campaign out of the analysis
 * never deletes anything: its data stays in Meta and in the database.
 */
export interface ExcludedCampaign {
  /** The verified Meta campaign ID. */
  id: string;
  /** The name as Meta returns it. For people reading this file only - it is never used for matching. */
  name: string;
}

/**
 * Empty until the recruitment campaign's ID has been verified and approved. Until then the dashboard and the Leads page
 * show a warning that the campaign is still counted.
 */
export const EXCLUDED_CAMPAIGNS: readonly ExcludedCampaign[] = [];

export interface CampaignScope {
  /** True for a campaign that is left out of every figure. */
  isExcluded(campaignId: string | null | undefined): boolean;
}

/** A scope built from a list of excluded campaigns. The app uses COURSE_SCOPE; tests build their own. */
export function createCampaignScope(excluded: readonly ExcludedCampaign[]): CampaignScope {
  const ids: ReadonlySet<string> = new Set(excluded.map((campaign) => campaign.id));
  return {
    isExcluded: (campaignId) => typeof campaignId === "string" && campaignId !== "" && ids.has(campaignId),
  };
}

export const COURSE_SCOPE: CampaignScope = createCampaignScope(EXCLUDED_CAMPAIGNS);

export function isExcludedCampaignId(campaignId: string | null | undefined): boolean {
  return COURSE_SCOPE.isExcluded(campaignId);
}

export function hasVerifiedExclusions(): boolean {
  return EXCLUDED_CAMPAIGNS.length > 0;
}

/** Shown on the live dashboard and the live Leads page until the recruitment campaign's ID is verified and added above. */
export const RECRUITMENT_NOT_EXCLUDED_MESSAGE =
  "קמפיין גיוס אנשי המכירות עדיין לא הוחרג מהמדדים: לא אושר Campaign ID מאומת להחרגה. עד לאישור הוא נכלל בהוצאה ובלידים.";
