import { formatCurrency, formatDecimal, formatMultiplier, formatNumber, formatPercent } from "@/lib/format";
import type { PerformanceMetrics } from "@/lib/types";

/**
 * Single source of truth for the performance table's metric columns. Adding,
 * removing or reordering a column later (or changing what's visible by default)
 * only touches this array - the table component renders whatever it's given.
 */
export interface PerformanceColumnDef {
  key: keyof PerformanceMetrics;
  label: string;
  labelHe: string;
  labelEn: string;
  format: (metrics: PerformanceMetrics) => string;
  defaultVisible: boolean;
  /** Marks the business-result columns that should visually stand out in the table. */
  highlight?: boolean;
}

export const PERFORMANCE_COLUMNS: PerformanceColumnDef[] = [
  { key: "spend", labelHe: "הוצאה", labelEn: "Spend", label: "הוצאה (Spend)", format: (m) => formatCurrency(m.spend), defaultVisible: true },
  { key: "impressions", labelHe: "חשיפות", labelEn: "Impressions", label: "חשיפות (Impressions)", format: (m) => formatNumber(m.impressions), defaultVisible: true },
  { key: "reach", labelHe: "תפוצה", labelEn: "Reach", label: "תפוצה (Reach)", format: (m) => formatNumber(m.reach), defaultVisible: true },
  { key: "frequency", labelHe: "תדירות", labelEn: "Frequency", label: "תדירות (Frequency)", format: (m) => formatDecimal(m.frequency, 2), defaultVisible: true },
  { key: "linkClicks", labelHe: "קליקים על קישור", labelEn: "Link Clicks", label: "קליקים על קישור (Link Clicks)", format: (m) => formatNumber(m.linkClicks), defaultVisible: true },
  { key: "ctr", labelHe: "שיעור הקלקה", labelEn: "CTR", label: "שיעור הקלקה (CTR)", format: (m) => formatPercent(m.ctr, 2), defaultVisible: true },
  { key: "cpc", labelHe: "עלות לקליק", labelEn: "CPC", label: "עלות לקליק (CPC)", format: (m) => formatCurrency(m.cpc), defaultVisible: true },
  { key: "cpm", labelHe: "עלות לאלף חשיפות", labelEn: "CPM", label: "עלות לאלף חשיפות (CPM)", format: (m) => formatCurrency(m.cpm), defaultVisible: true },
  { key: "leads", labelHe: "לידים", labelEn: "Leads", label: "לידים (Leads)", format: (m) => formatNumber(m.leads), defaultVisible: true, highlight: true },
  { key: "cpl", labelHe: "עלות לליד", labelEn: "CPL", label: "עלות לליד (CPL)", format: (m) => formatCurrency(m.cpl), defaultVisible: true, highlight: true },
  { key: "sales", labelHe: "מכירות", labelEn: "Sales", label: "מכירות (Sales)", format: (m) => formatNumber(m.sales), defaultVisible: true, highlight: true },
  { key: "closeRate", labelHe: "אחוז סגירה", labelEn: "Close Rate", label: "אחוז סגירה (Close Rate)", format: (m) => formatPercent(m.closeRate, 1), defaultVisible: true, highlight: true },
  { key: "costPerSale", labelHe: "עלות למכירה", labelEn: "Cost per Sale", label: "עלות למכירה (Cost per Sale)", format: (m) => formatCurrency(m.costPerSale), defaultVisible: true, highlight: true },
  { key: "revenue", labelHe: "הכנסות", labelEn: "Revenue", label: "הכנסות (Revenue)", format: (m) => formatCurrency(m.revenue), defaultVisible: true, highlight: true },
  { key: "roas", labelHe: "החזר על הוצאות פרסום", labelEn: "ROAS", label: "החזר על הוצאות פרסום (ROAS)", format: (m) => formatMultiplier(m.roas), defaultVisible: true, highlight: true },
];

export const DEFAULT_VISIBLE_COLUMN_KEYS = new Set(
  PERFORMANCE_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key)
);
