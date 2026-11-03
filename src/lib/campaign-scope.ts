/**
 * Campaigns that are not course campaigns. They are left out of every course figure: spend, leads, CPL, Qualified CPL,
 * sales, close rate, cost per registration, revenue, the irrelevant lead rate, and the dashboard. The future optimization
 * engine (stage 2) must read this same list.
 *
 * Only a VERIFIED Meta campaign ID belongs here, and matching is by that ID alone. A campaign is never matched by its name.
 * Leaving a campaign out of the course figures never deletes anything. Its data stays in Meta, in the database, and in the
 * advertising response (as excludedCampaigns), where nothing course-related reads it.
 */
export interface ExcludedCampaign {
  /** The verified Meta campaign ID. Compared as a string, so long IDs are never rounded. */
  id: string;
  /** The name as Meta returns it. For people reading this file only - it is never used for matching. */
  name: string;
}

/**
 * The recruitment campaign, verified by its Meta campaign ID on request. Its records are kept; only the course analysis
 * leaves them out.
 */
export const EXCLUDED_CAMPAIGNS: readonly ExcludedCampaign[] = [{ id: "120248773681350125", name: "דרושים | אנשי מכירות" }];

export interface CampaignScope {
  /** True for a campaign that is left out of every course figure. */
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

/** Shown on the live dashboard and the live Leads page only while no verified campaign ID is configured. */
export const RECRUITMENT_NOT_EXCLUDED_MESSAGE =
  "קמפיין גיוס אנשי המכירות עדיין לא הוחרג מהמדדים: לא אושר Campaign ID מאומת להחרגה. עד לאישור הוא נכלל בהוצאה ובלידים.";
