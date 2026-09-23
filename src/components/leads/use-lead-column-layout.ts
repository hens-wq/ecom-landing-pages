"use client";

import { useMemo, useState } from "react";

import {
  ANCHORED_LEAD_COLUMN_KEYS,
  DEFAULT_CONFIGURABLE_LEAD_COLUMN_ORDER,
  DEFAULT_LEAD_COLUMN_WIDTHS,
  LEAD_COLUMN_DEFAULTS,
  LEAD_COLUMN_KEYS,
  type LeadColumnKey,
} from "@/components/leads/lead-columns";
import type { MetaFormLead } from "@/lib/leads";

const STORAGE_KEY = "ecom:leads-table:column-layout:v1";
const CONFIGURABLE_KEYS = new Set<LeadColumnKey>(DEFAULT_CONFIGURABLE_LEAD_COLUMN_ORDER);

function isConfigurableKey(value: unknown): value is LeadColumnKey {
  return typeof value === "string" && CONFIGURABLE_KEYS.has(value as LeadColumnKey);
}

interface StoredLayout {
  widths: Partial<Record<LeadColumnKey, number>>;
  order: LeadColumnKey[];
  visibleKeys: LeadColumnKey[];
}

function loadStoredLayout(): StoredLayout {
  const fallback: StoredLayout = { widths: {}, order: [...DEFAULT_CONFIGURABLE_LEAD_COLUMN_ORDER], visibleKeys: [...DEFAULT_CONFIGURABLE_LEAD_COLUMN_ORDER] };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallback;
    const record = parsed as Record<string, unknown>;

    const widths: Partial<Record<LeadColumnKey, number>> = {};
    if (record.widths && typeof record.widths === "object") {
      for (const key of LEAD_COLUMN_KEYS) {
        const value = (record.widths as Record<string, unknown>)[key];
        if (typeof value === "number" && Number.isFinite(value)) widths[key] = value;
      }
    }

    const order = Array.isArray(record.order) ? record.order.filter(isConfigurableKey) : [];
    for (const key of DEFAULT_CONFIGURABLE_LEAD_COLUMN_ORDER) if (!order.includes(key)) order.push(key);

    const visibleKeys = Array.isArray(record.visibleKeys) ? record.visibleKeys.filter(isConfigurableKey) : [...DEFAULT_CONFIGURABLE_LEAD_COLUMN_ORDER];

    return { widths, order, visibleKeys };
  } catch {
    return fallback;
  }
}

function persistLayout(layout: StoredLayout) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // localStorage unavailable (private browsing, quota) - layout still works for this session, it just won't survive a refresh.
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

function sameOrder(a: LeadColumnKey[], b: readonly LeadColumnKey[]): boolean {
  return a.length === b.length && a.every((key, i) => key === b[i]);
}

export interface LeadColumnLayoutState {
  widths: Record<LeadColumnKey, number>;
  /** The configurable columns in their current order (regardless of visibility). */
  orderedConfigurableKeys: LeadColumnKey[];
  visibleConfigurableKeys: Set<LeadColumnKey>;
  /** The full render order for this render pass: the fixed anchored cluster, then the visible configurable columns in their current order. */
  visibleColumnOrder: LeadColumnKey[];
  /** Applies a pixel delta (already RTL-adjusted - see ColumnResizeHandle) to one column, clamped to its min/max, and persists the result. */
  resizeColumn: (key: LeadColumnKey, deltaPx: number) => void;
  moveConfigurableColumn: (fromIndex: number, toIndex: number) => void;
  toggleColumnVisibility: (key: LeadColumnKey) => void;
  resetLayout: () => void;
  hasCustomLayout: boolean;
}

/**
 * Manually resized widths always win; everything else auto-fits to the
 * currently visible leads (see computeAutoFitWidths) and re-fits whenever
 * that data changes - e.g. a different date range bringing in longer/
 * shorter names. Order and visibility only ever apply to the CONFIGURABLE
 * columns (lead-columns.ts) - the anchored operational cluster (Lead Date
 * through Payments) is always visible, in its fixed order, never touched
 * here.
 */
export function useLeadColumnLayout(leads: MetaFormLead[]): LeadColumnLayoutState {
  const [widthOverrides, setWidthOverrides] = useState<Partial<Record<LeadColumnKey, number>>>(() => loadStoredLayout().widths);
  const [order, setOrder] = useState<LeadColumnKey[]>(() => loadStoredLayout().order);
  const [visibleKeys, setVisibleKeys] = useState<Set<LeadColumnKey>>(() => new Set(loadStoredLayout().visibleKeys));

  const autoFitWidths = useMemo(() => computeAutoFitWidths(leads), [leads]);

  const widths: Record<LeadColumnKey, number> = useMemo(() => {
    const result = {} as Record<LeadColumnKey, number>;
    for (const key of LEAD_COLUMN_KEYS) {
      result[key] = widthOverrides[key] ?? autoFitWidths[key] ?? DEFAULT_LEAD_COLUMN_WIDTHS[key];
    }
    return result;
  }, [widthOverrides, autoFitWidths]);

  const visibleColumnOrder = useMemo(
    () => [...ANCHORED_LEAD_COLUMN_KEYS, ...order.filter((key) => visibleKeys.has(key))],
    [order, visibleKeys]
  );

  function persist(nextWidths: Partial<Record<LeadColumnKey, number>>, nextOrder: LeadColumnKey[], nextVisible: Set<LeadColumnKey>) {
    persistLayout({ widths: nextWidths, order: nextOrder, visibleKeys: Array.from(nextVisible) });
  }

  function resizeColumn(key: LeadColumnKey, deltaPx: number) {
    setWidthOverrides((prev) => {
      const def = LEAD_COLUMN_DEFAULTS[key];
      const current = prev[key] ?? autoFitWidths[key] ?? def.width;
      const next = { ...prev, [key]: Math.min(def.max, Math.max(def.min, Math.round(current + deltaPx))) };
      persist(next, order, visibleKeys);
      return next;
    });
  }

  function moveConfigurableColumn(fromIndex: number, toIndex: number) {
    setOrder((prev) => {
      if (toIndex < 0 || toIndex >= prev.length || fromIndex === toIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      persist(widthOverrides, next, visibleKeys);
      return next;
    });
  }

  function toggleColumnVisibility(key: LeadColumnKey) {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      persist(widthOverrides, order, next);
      return next;
    });
  }

  function resetLayout() {
    setWidthOverrides({});
    setOrder([...DEFAULT_CONFIGURABLE_LEAD_COLUMN_ORDER]);
    setVisibleKeys(new Set(DEFAULT_CONFIGURABLE_LEAD_COLUMN_ORDER));
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }

  const hasCustomLayout =
    Object.keys(widthOverrides).length > 0 ||
    !sameOrder(order, DEFAULT_CONFIGURABLE_LEAD_COLUMN_ORDER) ||
    visibleKeys.size !== DEFAULT_CONFIGURABLE_LEAD_COLUMN_ORDER.length;

  return {
    widths,
    orderedConfigurableKeys: order,
    visibleConfigurableKeys: visibleKeys,
    visibleColumnOrder,
    resizeColumn,
    moveConfigurableColumn,
    toggleColumnVisibility,
    resetLayout,
    hasCustomLayout,
  };
}
