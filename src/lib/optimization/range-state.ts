import type { DateRange } from "@/lib/advertising/types";

/**
 * Whether the saved report on screen answers the range now on the picker. "changed" means the picker moved after the
 * report was run: the report is then not presented as the answer for the new range.
 */
export type RangeState = "none" | "current" | "changed";

export function rangeStateOf(report: DateRange | null, selected: DateRange): RangeState {
  if (report === null) return "none";
  return report.since === selected.since && report.until === selected.until ? "current" : "changed";
}
