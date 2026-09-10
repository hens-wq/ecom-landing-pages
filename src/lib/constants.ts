import type { DateRangePreset } from "@/lib/types";

export const NAV_ITEMS = [
  { href: "/", label: "דשבורד", labelEn: "Dashboard" },
  { href: "/sales-matching", label: "מכירות והתאמות", labelEn: "Sales & Matching" },
  { href: "/integrations", label: "חיבורים", labelEn: "Integrations" },
] as const;

/** Phase 1: presets scale the 30-day mock baseline for UI interactivity - no live data source yet. */
export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  { id: "today", label: "היום", scale: 1 / 30 },
  { id: "last_7", label: "7 הימים האחרונים", scale: 7 / 30 },
  { id: "last_30", label: "30 הימים האחרונים", scale: 1 },
  { id: "last_90", label: "הרבעון האחרון", scale: 3 },
];

export const DEFAULT_DATE_RANGE_PRESET_ID = "last_30";

/** Placeholder only - Phase 2 will populate this from the Meta Ads API. */
export const AD_ACCOUNTS = [{ id: "act_ecom_main", name: "Ecom - חשבון פרסום ראשי" }];
