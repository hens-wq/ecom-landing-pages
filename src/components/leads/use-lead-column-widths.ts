"use client";

import { useMemo, useState } from "react";

import { DEFAULT_LEAD_COLUMN_WIDTHS, LEAD_COLUMN_DEFAULTS, LEAD_COLUMN_KEYS, type LeadColumnKey } from "@/components/leads/lead-columns";
import type { MetaFormLead } from "@/lib/leads";

const STORAGE_KEY = "ecom:leads-table:column-widths:v1";

function loadStoredWidths(): Partial<Record<LeadColumnKey, number>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const result: Partial<Record<LeadColumnKey, number>> = {};
    for (const key of LEAD_COLUMN_KEYS) {
      const value = (parsed as Record<string, unknown>)[key];
      if (typeof value === "number" && Number.isFinite(value)) result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

function persistWidths(widths: Partial<Record<LeadColumnKey, number>>) {
  if (typeof window === "undefined") return;
  try {
    if (Object.keys(widths).length === 0) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
  } catch {
    // localStorage unavailable (private browsing, quota) - resizing still works for this session, it just won't survive a refresh.
  }
}

let measureCanvas: HTMLCanvasElement | null = null;
function measureTextWidth(text: string, font: string): number {
  if (typeof document === "undefined" || !text) return 0;
  measureCanvas ??= document.createElement("canvas");
  const ctx = measureCanvas.getContext("2d");
  if (!ctx) return 0;
  ctx.font = font;
  return ctx.measureText(text).width;
}

/** Matches the table's own text-sm (14px) Heebo body text - see globals.css. */
const AUTO_FIT_FONT = "14px Heebo, sans-serif";
/** px-3 cell padding (12px * 2) plus a small safety margin so a value doesn't sit right at the ellipsis threshold. */
const AUTO_FIT_CELL_PADDING = 32;

const AUTO_FIT_SOURCE: Partial<Record<LeadColumnKey, (lead: MetaFormLead) => string | null>> = {
  name: (lead) => lead.name,
  campaign: (lead) => lead.campaignName,
  adSet: (lead) => lead.adSetName,
  ad: (lead) => lead.adName,
};

/** Auto-fit widths for the text-heavy columns, computed from whatever leads are currently visible (see AUTO_FIT_SOURCE) - not a DOM measurement, so it never causes a layout flash on first paint. */
function computeAutoFitWidths(leads: MetaFormLead[]): Partial<Record<LeadColumnKey, number>> {
  const result: Partial<Record<LeadColumnKey, number>> = {};
  for (const [key, getValue] of Object.entries(AUTO_FIT_SOURCE) as [LeadColumnKey, (lead: MetaFormLead) => string | null][]) {
    const def = LEAD_COLUMN_DEFAULTS[key];
    let longest = 0;
    for (const lead of leads) {
      const value = getValue(lead);
      if (!value) continue;
      longest = Math.max(longest, measureTextWidth(value, AUTO_FIT_FONT));
    }
    result[key] = longest === 0 ? def.width : Math.min(def.max, Math.max(def.min, Math.ceil(longest) + AUTO_FIT_CELL_PADDING));
  }
  return result;
}

export interface LeadColumnWidthsState {
  widths: Record<LeadColumnKey, number>;
  /** Applies a pixel delta (already RTL-adjusted - see ColumnResizeHandle) to one column, clamped to its min/max, and persists the result. */
  resizeColumn: (key: LeadColumnKey, deltaPx: number) => void;
  resetWidths: () => void;
  /** Whether any column has ever been manually resized - drives whether "Reset Column Layout" is worth showing. */
  hasCustomWidths: boolean;
}

/** Manually resized widths always win; everything else auto-fits to the currently visible leads (see computeAutoFitWidths) and re-fits whenever that data changes - e.g. a different date range bringing in longer/shorter names. */
export function useLeadColumnWidths(leads: MetaFormLead[]): LeadColumnWidthsState {
  const [overrides, setOverrides] = useState<Partial<Record<LeadColumnKey, number>>>(loadStoredWidths);

  const autoFitWidths = useMemo(() => computeAutoFitWidths(leads), [leads]);

  const widths: Record<LeadColumnKey, number> = useMemo(() => {
    const result = {} as Record<LeadColumnKey, number>;
    for (const key of LEAD_COLUMN_KEYS) {
      result[key] = overrides[key] ?? autoFitWidths[key] ?? DEFAULT_LEAD_COLUMN_WIDTHS[key];
    }
    return result;
  }, [overrides, autoFitWidths]);

  function resizeColumn(key: LeadColumnKey, deltaPx: number) {
    setOverrides((prev) => {
      const def = LEAD_COLUMN_DEFAULTS[key];
      const current = prev[key] ?? autoFitWidths[key] ?? def.width;
      const next = { ...prev, [key]: Math.min(def.max, Math.max(def.min, Math.round(current + deltaPx))) };
      persistWidths(next);
      return next;
    });
  }

  function resetWidths() {
    setOverrides({});
    persistWidths({});
  }

  return { widths, resizeColumn, resetWidths, hasCustomWidths: Object.keys(overrides).length > 0 };
}
