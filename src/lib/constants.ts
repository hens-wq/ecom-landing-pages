import { currentMonthDateRange, presetDaysToDateRange, singleDayDateRange } from "@/lib/advertising/date-range";
import type { DateRangePreset, LeadSourceType } from "@/lib/types";

export const NAV_ITEMS = [
  { href: "/", label: "דשבורד", labelEn: "Dashboard" },
  { href: "/leads", label: "לידים", labelEn: "Leads" },
  { href: "/sales-matching", label: "מכירות והתאמות", labelEn: "Sales & Matching" },
  { href: "/integrations", label: "חיבורים", labelEn: "Integrations" },
] as const;

export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  { id: "today", label: "היום", resolve: (today) => singleDayDateRange(0, today) },
  { id: "yesterday", label: "אתמול", resolve: (today) => singleDayDateRange(1, today) },
  { id: "last_7", label: "7 הימים האחרונים", resolve: (today) => presetDaysToDateRange(7, today) },
  { id: "last_30", label: "30 הימים האחרונים", resolve: (today) => presetDaysToDateRange(30, today) },
  { id: "current_month", label: "חודש נוכחי", resolve: (today) => currentMonthDateRange(today) },
];

/** First preset in the list above ("today") - both Dashboard and Leads open on Today by default, per spec. */
export const DEFAULT_DATE_RANGE_PRESET_ID = DATE_RANGE_PRESETS[0].id;

/** Placeholder only - real values come from Meta once META_ACCESS_TOKEN / META_AD_ACCOUNT_ID are configured. */
export const AD_ACCOUNTS = [{ id: "act_ecom_main", name: "Ecom - חשבון פרסום ראשי" }];

/** Shared display labels for LeadSourceType - single source used by the performance table (ad destination) and the Leads page's מקור ליד column/filter. */
export const LEAD_SOURCE_LABELS: Record<LeadSourceType, { short: string; full: string }> = {
  meta_standard_form: { short: "טופס Meta רגיל", full: "טופס Meta רגיל (Meta Standard Form)" },
  meta_rich_form: { short: "טופס Meta Rich", full: "טופס Meta Rich (Meta Rich Form)" },
  landing_page: { short: "דף נחיתה", full: "דף נחיתה (Landing Page)" },
  unknown: { short: "לא ידוע", full: "מקור לא ידוע (Unknown Source)" },
};
