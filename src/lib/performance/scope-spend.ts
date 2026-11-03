import type { CampaignRow } from "@/lib/aggregate";
import type { CampaignStatusMap } from "@/lib/campaign-status";

export interface SpendScope {
  campaignId: string | null;
  adSetId: string | null;
  adId: string | null;
  campaignStatus: "active" | "inactive" | null;
}

/**
 * The spend for the campaign, ad set, ad and campaign-status scope the Leads page has selected. Matching is by ID only.
 * Spend from ads that Meta's listing no longer returns has no campaign to match, so it counts only when nothing
 * narrower is selected and the status filter is not "active".
 */
export function sumScopedSpend(campaignRows: CampaignRow[], campaignStatuses: CampaignStatusMap, scope: SpendScope): number {
  const narrowed = scope.campaignId !== null || scope.adSetId !== null || scope.adId !== null;
  let total = 0;

  for (const row of campaignRows) {
    if (row.isUnlisted) {
      if (!narrowed && scope.campaignStatus !== "active") total += row.metrics.spend;
      continue;
    }
    for (const adSet of row.adSets) {
      for (const ad of adSet.ads) {
        if (scope.campaignId && row.id !== scope.campaignId) continue;
        if (scope.adSetId && adSet.id !== scope.adSetId) continue;
        if (scope.adId && ad.id !== scope.adId) continue;
        if (scope.campaignStatus) {
          const isActive = (campaignStatuses[row.id] ?? "ended") === "active";
          if (scope.campaignStatus === "active" && !isActive) continue;
          if (scope.campaignStatus === "inactive" && isActive) continue;
        }
        total += ad.metrics.spend;
      }
    }
  }
  return total;
}
