/**
 * CPL bands agreed by Ecom: up to 80 ₪ is on target, 80 to under 100 ₪ needs
 * follow-up, 100 to under 150 ₪ is a warning, and 150 ₪ or more is a severe overrun.
 * A high CPL is not a stop signal when the registrations justify the spend, and a
 * low CPL does not prove the leads are good. The bands live here, once.
 */
export const CPL_TARGET_MAX = 80;
export const CPL_WARNING_FROM = 100;
export const CPL_SEVERE_FROM = 150;

export type CplTier = "on_target" | "follow_up" | "warning" | "severe";

export function cplTier(cpl: number | null | undefined): CplTier | null {
  if (cpl === null || cpl === undefined || !Number.isFinite(cpl)) return null;
  if (cpl <= CPL_TARGET_MAX) return "on_target";
  if (cpl < CPL_WARNING_FROM) return "follow_up";
  if (cpl < CPL_SEVERE_FROM) return "warning";
  return "severe";
}

export const CPL_TIER_LABELS: Record<CplTier, string> = {
  on_target: "בתוך היעד",
  follow_up: "מעקב",
  warning: "אזהרה",
  severe: "חריגה חמורה",
};

export const CPL_TIER_HINT =
  "CPL גבוה אינו הוראת עצירה כשההרשמות מצדיקות את ההוצאה, ו-CPL נמוך אינו הוכחה לאיכות הלידים.";
