import type { DateRangePreset, LeadSourceType } from "@/lib/types";

export const NAV_ITEMS = [
  { href: "/", label: "דשבורד", labelEn: "Dashboard" },
  { href: "/sales-matching", label: "מכירות והתאמות", labelEn: "Sales & Matching" },
  { href: "/integrations", label: "חיבורים", labelEn: "Integrations" },
] as const;

export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  { id: "today", label: "היום", days: 1 },
  { id: "last_7", label: "7 הימים האחרונים", days: 7 },
  { id: "last_30", label: "30 הימים האחרונים", days: 30 },
  { id: "last_90", label: "הרבעון האחרון", days: 90 },
];

export const DEFAULT_DATE_RANGE_PRESET_ID = "last_30";

/** Placeholder only - real values come from Meta once META_ACCESS_TOKEN / META_AD_ACCOUNT_ID are configured. */
export const AD_ACCOUNTS = [{ id: "act_ecom_main", name: "Ecom - חשבון פרסום ראשי" }];

/** Shared display labels for LeadSourceType - single source used by the performance table (ad destination) and the Sales & Matching table (lead source). */
export const LEAD_SOURCE_LABELS: Record<LeadSourceType, { short: string; full: string }> = {
  meta_standard_form: { short: "טופס סטנדרטי", full: "טופס Meta סטנדרטי (Meta Standard Form)" },
  meta_rich_form: { short: "טופס מורחב", full: "טופס Meta מורחב (Meta Rich Form)" },
  landing_page: { short: "דף נחיתה", full: "דף נחיתה (Landing Page)" },
  unknown: { short: "לא ידוע", full: "מקור לא ידוע (Unknown Source)" },
};
