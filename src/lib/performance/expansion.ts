import type { CampaignRow } from "@/lib/aggregate";

/** Ids of every row that has children (campaigns and ad sets). Used by "הרחב הכול". */
export function expandableRowIds(rows: CampaignRow[]): string[] {
  const ids: string[] = [];
  for (const campaign of rows) {
    if (campaign.adSets.length === 0) continue;
    ids.push(campaign.id);
    for (const adSet of campaign.adSets) {
      if (adSet.ads.length > 0) ids.push(adSet.id);
    }
  }
  return ids;
}
