import type { RowFlags } from "@/lib/aggregate";
import { PERFORMANCE_COLUMNS, type PerformanceColumnDef } from "@/lib/columns";
import type { PerformanceMetrics } from "@/lib/types";

/**
 * Decides what a table or KPI cell shows. Three different situations look alike
 * on screen unless they're kept apart:
 *  - value:          a real number (partial when some of its leads have no status yet)
 *  - unknown:        the data needed for it could not be loaded - never shown as 0
 *  - not_applicable: it doesn't apply to this row (spend for leads with no ad)
 */
export type CellState = "value" | "unknown" | "not_applicable";

export interface CellDisplay {
  state: CellState;
  /** The formatted value, or "—" when there is nothing to show. */
  text: string;
  /** True when the number covers only the leads whose status was loaded. */
  partial: boolean;
}

export type DisplayRow = RowFlags & { metrics: PerformanceMetrics };

const DASH = "—";

/** Meta delivery figures. They don't apply to a row that holds leads but no ad. */
const DELIVERY_KEYS = new Set<keyof PerformanceMetrics>(["spend", "impressions", "reach", "frequency", "linkClicks", "ctr", "cpc", "cpm"]);
/** Figures that divide by spend. */
const SPEND_KEYS = new Set<keyof PerformanceMetrics>(["cpl", "costPerSale", "roas"]);
/** Figures that need the lead data. */
const LEAD_KEYS = new Set<keyof PerformanceMetrics>(["leads", "cpl", "sales", "closeRate", "costPerSale", "revenue", "roas"]);
/** Figures that depend on each lead's status. */
const STATUS_KEYS = new Set<keyof PerformanceMetrics>(["sales", "closeRate", "costPerSale", "revenue", "roas"]);

export function cellDisplay(row: DisplayRow, column: PerformanceColumnDef): CellDisplay {
  const key = column.key;

  // Unlisted spend has no leads of its own, so every lead-based figure is not applicable to it.
  if (row.isUnlisted && LEAD_KEYS.has(key)) {
    return { state: "not_applicable", text: DASH, partial: false };
  }

  if (row.isUnassigned && (DELIVERY_KEYS.has(key) || SPEND_KEYS.has(key))) {
    return { state: "not_applicable", text: DASH, partial: false };
  }
  if (!row.leadsKnown && LEAD_KEYS.has(key)) {
    return { state: "unknown", text: DASH, partial: false };
  }
  if (STATUS_KEYS.has(key) && row.unknownStatusLeads > 0 && row.unknownStatusLeads >= row.metrics.leads) {
    return { state: "unknown", text: DASH, partial: false };
  }

  const formatted = column.format(row.metrics);
  return {
    state: "value",
    text: formatted === "-" ? DASH : formatted,
    partial: STATUS_KEYS.has(key) && row.unknownStatusLeads > 0,
  };
}

export function columnByKey(key: keyof PerformanceMetrics): PerformanceColumnDef | undefined {
  return PERFORMANCE_COLUMNS.find((column) => column.key === key);
}
