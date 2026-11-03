import type { CampaignRow } from "@/lib/aggregate";
import type { EntityStatus } from "@/lib/types";

/**
 * The rows the "פעילים בלבד" filter keeps. A campaign that is active now stays. So does any row with results in the selected
 * range (spend, impressions or leads), even when its campaign has since been switched off, so a turned-off campaign that
 * spent money still counts. Only idle rows are hidden. They hold nothing the totals add up, so the totals never change with
 * this filter.
 */
export function filterVisibleCampaignRows(rows: CampaignRow[], statuses: Record<string, EntityStatus>, activeOnly: boolean): CampaignRow[] {
  if (!activeOnly) return rows;
  return rows.filter((row) => hasResults(row) || isActiveCampaign(row, statuses));
}

function hasResults(row: CampaignRow): boolean {
  return row.metrics.spend > 0 || row.metrics.impressions > 0 || row.metrics.leads > 0;
}

function isActiveCampaign(row: CampaignRow, statuses: Record<string, EntityStatus>): boolean {
  return !row.isUnassigned && !row.isUnlisted && (statuses[row.id] ?? "ended") === "active";
}
