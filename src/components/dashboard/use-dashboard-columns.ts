"use client";

import { useMemo, useState } from "react";

import { DEFAULT_VISIBLE_COLUMN_KEYS, PERFORMANCE_COLUMNS, type PerformanceColumnDef } from "@/lib/columns";
import type { PerformanceMetrics } from "@/lib/types";

type MetricKey = keyof PerformanceMetrics;

const STORAGE_KEY = "ecom:dashboard:columns:v1";
const DEFAULT_ORDER: MetricKey[] = PERFORMANCE_COLUMNS.map((column) => column.key);
const COLUMN_DEFS_BY_KEY = new Map<MetricKey, PerformanceColumnDef>(PERFORMANCE_COLUMNS.map((column) => [column.key, column]));

function isMetricKey(value: unknown): value is MetricKey {
  return typeof value === "string" && COLUMN_DEFS_BY_KEY.has(value as MetricKey);
}

interface StoredLayout {
  order: MetricKey[];
  visibleKeys: MetricKey[];
}

function loadStoredLayout(): StoredLayout | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const rawOrder = (parsed as Record<string, unknown>).order;
    const rawVisible = (parsed as Record<string, unknown>).visibleKeys;
    if (!Array.isArray(rawOrder) || !Array.isArray(rawVisible)) return null;
    const order = rawOrder.filter(isMetricKey);
    // A column missing from a stale persisted order (e.g. a new metric shipped later) is appended at the end, never silently dropped from the table.
    for (const key of DEFAULT_ORDER) if (!order.includes(key)) order.push(key);
    return { order, visibleKeys: rawVisible.filter(isMetricKey) };
  } catch {
    return null;
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

function sameOrder(a: MetricKey[], b: MetricKey[]): boolean {
  return a.length === b.length && a.every((key, i) => key === b[i]);
}

function sameKeySet(keys: Set<MetricKey>, defaults: Set<MetricKey>): boolean {
  return keys.size === defaults.size && Array.from(keys).every((key) => defaults.has(key));
}

export interface DashboardColumnsState {
  /** PERFORMANCE_COLUMNS in the user's current order (regardless of visibility). */
  orderedColumns: PerformanceColumnDef[];
  /** orderedColumns filtered to only the currently-visible ones - what the table actually renders. */
  visibleColumns: PerformanceColumnDef[];
  visibleKeys: Set<MetricKey>;
  toggleColumn: (key: MetricKey) => void;
  moveColumn: (fromIndex: number, toIndex: number) => void;
  reset: () => void;
  hasCustomLayout: boolean;
}

/** Manages the Dashboard performance table's column order + visibility, persisted together as one UI preference (localStorage) - see the "עמודות (Columns)" panel. Never touches any business data. */
export function useDashboardColumns(): DashboardColumnsState {
  const [order, setOrder] = useState<MetricKey[]>(() => loadStoredLayout()?.order ?? DEFAULT_ORDER);
  const [visibleKeys, setVisibleKeys] = useState<Set<MetricKey>>(
    () => new Set(loadStoredLayout()?.visibleKeys ?? Array.from(DEFAULT_VISIBLE_COLUMN_KEYS))
  );

  const orderedColumns = useMemo(
    () => order.map((key) => COLUMN_DEFS_BY_KEY.get(key)).filter((c): c is PerformanceColumnDef => Boolean(c)),
    [order]
  );
  const visibleColumns = useMemo(() => orderedColumns.filter((column) => visibleKeys.has(column.key)), [orderedColumns, visibleKeys]);

  function toggleColumn(key: MetricKey) {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      persistLayout({ order, visibleKeys: Array.from(next) });
      return next;
    });
  }

  function moveColumn(fromIndex: number, toIndex: number) {
    setOrder((prev) => {
      if (toIndex < 0 || toIndex >= prev.length || fromIndex === toIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      persistLayout({ order: next, visibleKeys: Array.from(visibleKeys) });
      return next;
    });
  }

  function reset() {
    setOrder(DEFAULT_ORDER);
    setVisibleKeys(new Set(DEFAULT_VISIBLE_COLUMN_KEYS));
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }

  const hasCustomLayout = !sameOrder(order, DEFAULT_ORDER) || !sameKeySet(visibleKeys, DEFAULT_VISIBLE_COLUMN_KEYS);

  return { orderedColumns, visibleColumns, visibleKeys, toggleColumn, moveColumn, reset, hasCustomLayout };
}
