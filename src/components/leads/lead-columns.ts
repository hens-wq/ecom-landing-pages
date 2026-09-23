import type { CSSProperties } from "react";

/**
 * The operational cluster - always visible, fixed relative order, never
 * part of the show/hide or reorder system (see use-lead-column-layout.ts).
 * These are the columns a marketer is actively editing while scrolling
 * through the table, so their position must never move under them.
 */
export const ANCHORED_LEAD_COLUMN_KEYS = [
  "leadDate",
  "name",
  "phone",
  "mainStatus",
  "secondaryStatus",
  "fullPayment",
  "partialPayment",
] as const;

/**
 * Everything else - hideable and reorderable (see use-lead-column-layout.ts
 * + lead-column-visibility-menu.tsx). Default order keeps every existing
 * column exactly where it already was; the new ID/Outcome columns are
 * appended at the end, per spec ("technical ID columns can appear later in
 * the table by default").
 */
export const DEFAULT_CONFIGURABLE_LEAD_COLUMN_ORDER = [
  "leadSource",
  "campaign",
  "adSet",
  "ad",
  "leadId",
  "campaignId",
  "adSetId",
  "adId",
  "outcome",
] as const;

/** Every column in the Leads table, in default reading (RTL) order - anchored cluster first, then the configurable ones. */
export const LEAD_COLUMN_KEYS = [...ANCHORED_LEAD_COLUMN_KEYS, ...DEFAULT_CONFIGURABLE_LEAD_COLUMN_ORDER] as const;

export type LeadColumnKey = (typeof LEAD_COLUMN_KEYS)[number];

export interface LeadColumnDefault {
  width: number;
  min: number;
  max: number;
  /** Auto-fit to the longest currently-visible value in this column until the user manually resizes it - see use-lead-column-layout.ts. */
  autoFit?: boolean;
}

export const LEAD_COLUMN_DEFAULTS: Record<LeadColumnKey, LeadColumnDefault> = {
  leadDate: { width: 150, min: 110, max: 220 },
  name: { width: 140, min: 90, max: 320, autoFit: true },
  phone: { width: 115, min: 90, max: 180 },
  mainStatus: { width: 150, min: 120, max: 220 },
  secondaryStatus: { width: 205, min: 140, max: 320 },
  fullPayment: { width: 140, min: 100, max: 220 },
  partialPayment: { width: 140, min: 100, max: 220 },
  leadSource: { width: 110, min: 90, max: 200 },
  campaign: { width: 160, min: 90, max: 360, autoFit: true },
  adSet: { width: 160, min: 90, max: 360, autoFit: true },
  ad: { width: 160, min: 90, max: 360, autoFit: true },
  leadId: { width: 150, min: 110, max: 260 },
  campaignId: { width: 160, min: 110, max: 240 },
  adSetId: { width: 160, min: 110, max: 240 },
  adId: { width: 160, min: 110, max: 240 },
  outcome: { width: 190, min: 140, max: 320 },
};

export const DEFAULT_LEAD_COLUMN_WIDTHS: Record<LeadColumnKey, number> = Object.fromEntries(
  LEAD_COLUMN_KEYS.map((key) => [key, LEAD_COLUMN_DEFAULTS[key].width])
) as Record<LeadColumnKey, number>;

/**
 * Only active from the `lg` breakpoint up (see usage sites) - below that the
 * identity/status columns are already first in reading order (see the
 * column order in leads-table.tsx), which is enough to avoid scrolling to
 * edit on a narrow screen without needing ~700px of frozen columns to fit
 * inside a ~400px viewport.
 *
 * IMPORTANT: the table itself must render with `table-fixed` (see
 * leads-table.tsx), and every column's width - sticky or not - must come
 * from the SAME live widths map the resize handles write to (see
 * use-lead-column-layout.ts). Two places computing a sticky column's `right`
 * offset from different snapshots of the widths (or a column silently
 * rendering wider than its declared width under auto layout) is exactly the
 * bug that made the sticky columns overlap/misalign earlier in this
 * project - table-fixed plus a single shared widths source closes that gap
 * for good, including while the user is actively dragging a divider.
 *
 * Deliberately a FIXED subset of the (also fixed) anchored cluster - the
 * show/hide/reorder system only ever touches the configurable columns
 * (never sticky), so reordering can never interact with this at all.
 */
export const STICKY_LEAD_COLUMN_KEYS: LeadColumnKey[] = ["leadDate", "name", "phone", "mainStatus", "secondaryStatus"];

/** The last sticky column - gets the visual border separating frozen from scrollable content. */
export const LAST_STICKY_COLUMN: LeadColumnKey = "secondaryStatus";

/** The `right` offset each sticky column needs, computed fresh from whatever the current widths happen to be. */
export function stickyRightOffsets(widths: Record<LeadColumnKey, number>): Partial<Record<LeadColumnKey, number>> {
  const offsets: Partial<Record<LeadColumnKey, number>> = {};
  let right = 0;
  for (const key of STICKY_LEAD_COLUMN_KEYS) {
    offsets[key] = right;
    right += widths[key];
  }
  return offsets;
}

export function columnStyle(width: number, rightOffset?: number): CSSProperties {
  return rightOffset === undefined ? { width, minWidth: width } : { width, minWidth: width, right: rightOffset };
}

/** Hebrew-first, English-in-parens header label per column - shared between the table headers and the column visibility/reorder menu so they can never drift. */
export const LEAD_COLUMN_LABELS: Record<LeadColumnKey, string> = {
  leadDate: "תאריך כניסת ליד (Lead Date)",
  name: "שם (Name)",
  phone: "טלפון (Phone)",
  mainStatus: "סטטוס ראשי (Main Status)",
  secondaryStatus: "סטטוס משני (Secondary Status)",
  fullPayment: "תשלום מלא (Full Payment)",
  partialPayment: "תשלום חלקי (Partial Payment)",
  leadSource: "מקור ליד (Lead Source)",
  campaign: "קמפיין (Campaign)",
  adSet: "סדרת מודעות (Ad Set)",
  ad: "מודעה (Ad)",
  leadId: "מזהה ליד (Lead Identifier / Meta Lead ID)",
  campaignId: "מזהה קמפיין (Campaign ID)",
  adSetId: "מזהה סדרת מודעות (Ad Set ID)",
  adId: "מזהה מודעה (Ad ID)",
  outcome: "תוצאה (Outcome)",
};
