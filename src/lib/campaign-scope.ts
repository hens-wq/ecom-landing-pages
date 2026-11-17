/**
 * Non-course campaigns never contribute spend, leads, sales or revenue to course analysis.
 * Verified IDs keep the exclusion stable after renames. Explicit recruitment-name markers also cover newly created
 * hiring campaigns; this classification never attributes a lead to a campaign by name and never deletes any records.
 */
export interface ExcludedCampaign {
  /** Verified Meta campaign ID, kept as a string so long IDs are never rounded. */
  id: string;
  /** Verified/display name. IDs continue to exclude the campaign after it is renamed. */
  name: string;
}

/** Verified against the same live Meta account. */
export const EXCLUDED_CAMPAIGNS: readonly ExcludedCampaign[] = [
  { id: "120248773681350125", name: "דרושים | אנשי מכירות" },
  { id: "120249086146440125", name: "דרושים | אנשי מכירות | דף נחיתה" },
  { id: "120249068790360125", name: "דרושים | רכזת גיוס | טופס לידים" },
];

/**
 * Explicit hiring markers only. Words such as עבודה, תעסוקה, קריירה or מכירות alone are deliberately NOT markers:
 * valid course campaigns can be called "נקודות כאב בעבודה" or "לשכת התעסוקה".
 */
export function isRecruitmentCampaignName(name: string | null | undefined): boolean {
  if (!name) return false;
  const normalized = name.normalize("NFKC")
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/[\u0591-\u05bd\u05bf-\u05c7]/g, "")
    .toLowerCase();
  const words = normalized.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const explicitMarkers = new Set(["דרושים", "דרושות", "דרוש", "דרושה", "recruitment", "recruiting", "hiring"]);
  if (words.some((word) => explicitMarkers.has(word))) return true;
  return /(?:^|\s)גיוס\s+(?:עובדים|עובדות|עובד|עובדת|אנשי מכירות|נציגי מכירות|נציגות מכירות)(?:\s|$)/u.test(words.join(" "));
}

export interface CampaignScope {
  isExcluded(campaignId: string | null | undefined, campaignName?: string | null): boolean;
}

/** Shared exclusion policy. Passing a name classifies recruitment only; all attribution and joins remain ID-based. */
export function createCampaignScope(excluded: readonly ExcludedCampaign[]): CampaignScope {
  const ids: ReadonlySet<string> = new Set(excluded.map((campaign) => campaign.id));
  return {
    isExcluded: (campaignId, campaignName) =>
      (typeof campaignId === "string" && campaignId !== "" && ids.has(campaignId)) || isRecruitmentCampaignName(campaignName),
  };
}

export const COURSE_SCOPE: CampaignScope = createCampaignScope(EXCLUDED_CAMPAIGNS);

/** ID-only compatibility for records that do not carry a campaign name (landing leads and stored diagnostics). */
export function isExcludedCampaignId(campaignId: string | null | undefined): boolean {
  return COURSE_SCOPE.isExcluded(campaignId);
}

export function isExcludedCampaign(campaignId: string | null | undefined, campaignName?: string | null): boolean {
  return COURSE_SCOPE.isExcluded(campaignId, campaignName);
}

/** Include both verified IDs and newly observed, explicitly named recruitment campaigns from a live listing. */
export function excludedCampaignIdsFrom(campaigns: readonly ExcludedCampaign[]): string[] {
  return [...new Set([...EXCLUDED_CAMPAIGNS.map((campaign) => campaign.id), ...campaigns.filter((campaign) => isExcludedCampaign(campaign.id, campaign.name)).map((campaign) => campaign.id)])];
}

export function hasVerifiedExclusions(): boolean {
  return EXCLUDED_CAMPAIGNS.length > 0;
}

export const RECRUITMENT_NOT_EXCLUDED_MESSAGE =
  "קמפיין גיוס אנשי המכירות עדיין לא הוחרג מהמדדים: לא אושר Campaign ID מאומת להחרגה. עד לאישור הוא נכלל בהוצאה ובלידים.";
