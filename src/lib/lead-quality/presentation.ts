import type { LeadQualityColor } from "./types";

/** Compare at ILS cent precision, matching the displayed CPL rather than rounding it to whole shekels. */
export function getCplColor(value: number | null | undefined): LeadQualityColor {
  if (value === null || value === undefined || !Number.isFinite(value) || value < 0) return "neutral";
  const cents = Math.round((value + Number.EPSILON) * 100);
  if (cents <= 8000) return "green";
  if (cents < 12000) return "orange";
  return "red";
}

export function formatCplCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value) || value < 0) return "—";
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return `₪\u00a0${rounded.toLocaleString("he-IL", { maximumFractionDigits: 2 })}`;
}
