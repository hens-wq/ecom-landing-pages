import type { EntityStatus } from "@/lib/types";

/** The shared Campaign Status filter of the four tabs. "active" is the default. */
export const CAMPAIGN_STATUS_FILTERS = ["active", "inactive", "all"] as const;
export type CampaignStatusFilter = (typeof CAMPAIGN_STATUS_FILTERS)[number];

export const DEFAULT_CAMPAIGN_STATUS_FILTER: CampaignStatusFilter = "active";

export const CAMPAIGN_STATUS_FILTER_LABELS: Record<CampaignStatusFilter, { en: string; he: string }> = {
  active: { en: "Active Only", he: "פעילים בלבד" },
  inactive: { en: "Paused / Inactive Only", he: "כבויים / לא פעילים בלבד" },
  all: { en: "All", he: "הכול" },
};

export function campaignMatchesFilter(status: EntityStatus, filter: CampaignStatusFilter): boolean {
  if (filter === "all") return true;
  return filter === "active" ? status === "active" : status !== "active";
}

/** The status of every campaign of a run, by campaign ID. */
export function campaignStatusesOf(rows: ReadonlyArray<{ level: string; id: string; status: EntityStatus }>): Map<string, EntityStatus> {
  const statuses = new Map<string, EntityStatus>();
  for (const row of rows) {
    if (row.level === "campaign") statuses.set(row.id, row.status);
  }
  return statuses;
}

/**
 * Whether a unit is in the selected scope, by its campaign's status. A unit whose campaign is not in the run's listing is
 * kept only under "All": its status is unknown, so it is never called active or inactive.
 */
export function inCampaignScope(campaignId: string, statuses: ReadonlyMap<string, EntityStatus>, filter: CampaignStatusFilter): boolean {
  const status = statuses.get(campaignId);
  if (status === undefined) return filter === "all";
  return campaignMatchesFilter(status, filter);
}
