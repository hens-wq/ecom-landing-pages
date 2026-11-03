import type { AdRow, AdSetRow, CampaignRow } from "@/lib/aggregate";
import { cellDisplay, columnByKey } from "@/lib/performance/display";
import type { EntityStatus, PerformanceMetrics } from "@/lib/types";

export type SortKey = "name" | "status" | keyof PerformanceMetrics;

export interface SortState {
  key: SortKey;
  direction: "asc" | "desc";
}

type SortableRow = CampaignRow | AdSetRow | AdRow;

const STATUS_RANK: Record<EntityStatus, number> = { active: 0, paused: 1, ended: 2 };

/**
 * The raw value a row sorts by, or null when there is nothing to sort by. It follows
 * the same rule that decides whether the cell shows a number, so a sort never puts
 * a "—" or an unknown figure in the middle of the numbers.
 */
function sortValue(row: SortableRow, key: SortKey): number | string | null {
  if (key === "name") return row.name;
  if (key === "status") return row.isUnassigned ? null : STATUS_RANK[row.status];

  const column = columnByKey(key);
  if (!column || cellDisplay(row, column).state !== "value") return null;
  const value = row.metrics[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function compareRows(a: SortableRow, b: SortableRow, sort: SortState): number {
  const valueA = sortValue(a, sort.key);
  const valueB = sortValue(b, sort.key);
  if (valueA === null || valueB === null) {
    // A missing value sinks to the bottom in either direction. A gap is never read as zero.
    if (valueA === null && valueB === null) return 0;
    return valueA === null ? 1 : -1;
  }

  const direction = sort.direction === "asc" ? 1 : -1;
  if (typeof valueA === "string" && typeof valueB === "string") return direction * valueA.localeCompare(valueB, "he");
  if (typeof valueA === "number" && typeof valueB === "number") return direction * (valueA - valueB);
  return 0;
}

/** Rows that hold unassigned leads always come after the real rows of the same level. */
function orderSiblings<T extends SortableRow>(rows: T[], sort: SortState | null): T[] {
  const real = rows.filter((row) => !row.isUnassigned);
  const unassigned = rows.filter((row) => row.isUnassigned);
  const ordered = sort ? [...real].sort((a, b) => compareRows(a, b, sort)) : real;
  return [...ordered, ...unassigned];
}

/**
 * Sorts each level inside its own parent, so the hierarchy is kept: campaigns among
 * campaigns, ad sets inside their campaign, ads inside their ad set. Sorting never
 * changes a number and never triggers a new request.
 */
export function sortCampaignRows(rows: CampaignRow[], sort: SortState | null): CampaignRow[] {
  return orderSiblings(rows, sort).map((campaign) => ({
    ...campaign,
    adSets: orderSiblings(campaign.adSets, sort).map((adSet) => ({
      ...adSet,
      ads: orderSiblings(adSet.ads, sort),
    })),
  }));
}
