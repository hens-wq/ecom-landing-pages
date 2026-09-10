const NBSP = " ";

/** ₪12,345 - no decimals, thousands separator, "-" for missing data. */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `₪${NBSP}${Math.round(value).toLocaleString("he-IL")}`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return Math.round(value).toLocaleString("he-IL");
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${value.toLocaleString("he-IL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}

export function formatDecimal(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return value.toLocaleString("he-IL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** ROAS reads best as a multiplier: "3.2x". */
export function formatMultiplier(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${formatDecimal(value, 2)}x`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return `${formatDate(iso)} ${date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`;
}

/** Exact duration display: minutes/hours within the first day ("One Shot"), otherwise whole days. */
export function formatTimeToSale(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || minutes < 0) return "-";
  if (minutes < 60) return `${formatNumber(minutes)} דקות (One Shot)`;
  const hours = minutes / 60;
  if (hours < 24) return `${formatDecimal(hours, 1)} שעות (One Shot)`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "יום אחד";
  return `${formatNumber(days)} ימים`;
}
