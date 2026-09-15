import type { CSSProperties } from "react";

/**
 * Shared between leads-table.tsx (header cells) and lead-row.tsx (body
 * cells) so the sticky `right` offsets can never drift out of sync between
 * the two. Only active from the `lg` breakpoint up (see usage sites) -
 * below that the identity/status columns are already first in reading
 * order (see the column order in leads-table.tsx), which is enough to
 * avoid scrolling to edit on a narrow screen without needing ~700px of
 * frozen columns to fit inside a ~400px viewport.
 *
 * IMPORTANT: the table itself must render with `table-fixed` (see
 * leads-table.tsx). With the browser's default auto layout, a column's
 * *actual* rendered width can silently grow past the `width` set here
 * whenever a cell's content needs more room (a long date string, a long
 * secondary-status option inside the native <select>, etc) - since the
 * `right` offsets below are fixed numbers, that silent growth desyncs a
 * sticky column from where the browser thinks it should be, and the frozen
 * columns visibly overlap/misalign once the table is scrolled. `table-fixed`
 * makes these widths authoritative instead of advisory, closing that gap.
 */
const LEAD_COLUMN_WIDTHS = {
  leadDate: 150,
  name: 140,
  phone: 115,
  mainStatus: 150,
  secondaryStatus: 205,
} as const;

export type LeadStickyColumnKey = keyof typeof LEAD_COLUMN_WIDTHS;

const STICKY_KEYS: LeadStickyColumnKey[] = ["leadDate", "name", "phone", "mainStatus", "secondaryStatus"];

function cumulativeRight(key: LeadStickyColumnKey): number {
  let right = 0;
  for (const k of STICKY_KEYS) {
    if (k === key) return right;
    right += LEAD_COLUMN_WIDTHS[k];
  }
  return right;
}

/** The last sticky column - gets the visual border separating frozen from scrollable content. */
export const LAST_STICKY_COLUMN: LeadStickyColumnKey = "secondaryStatus";

export function stickyColumnStyle(key: LeadStickyColumnKey): CSSProperties {
  const width = LEAD_COLUMN_WIDTHS[key];
  return { width, minWidth: width, right: cumulativeRight(key) };
}
