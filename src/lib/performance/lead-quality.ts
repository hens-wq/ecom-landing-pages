/**
 * Lead quality for Qualified CPL and the optimisation work. This is separate from
 * the operational "irrelevant leads" rate (lib/lead-status/calculations.ts), which
 * keeps its own definition.
 *
 * Quality follows the SECONDARY status. The labels below are the business's own
 * Hebrew vocabulary (lib/lead-status/types.ts). Matching only normalises characters
 * and separators - there is no fuzzy matching - so a label nobody has classified
 * yet stays "unmapped" instead of quietly becoming green or red.
 */

export type LeadQuality = "green" | "pending" | "red" | "unmapped";

export const GREEN_LEAD_LABELS = [
  "נרשם",
  "תשלום מלא",
  "תשלום חלקי",
  "בתהליך",
  'ל"מ - פוטנציאל עתידי',
  'ל"מ - לו"ז / מבנה הקורס',
  'ל"מ - בחר בתואר אקדמי',
  'ל"מ - מתחרים',
  'ל"מ - מחיר יקר',
  "ביטל הרשמה - לקוח התחרט",
] as const;

export const PENDING_LEAD_LABELS = ["חדש", 'א"מ - יום 1', 'א"מ - יום 2', 'א"מ - יום 3', "דאטה"] as const;

export const RED_LEAD_LABELS = [
  "ליד שגוי - מכחיש פנייה",
  "ליד שגוי - חשב/ה בחינם",
  "ליד שגוי - חשב/ה מדובר בעבודה",
  "ליד שגוי - מס' טלפון שגוי",
  "ליד שגוי - מבוגר",
  "ליד שגוי - קטין",
  "ליד שגוי - לא ענה מעולם",
  "ליד שגוי - לקוח קיים",
  "ליד שגוי - ליד כפול",
  'ל"מ - לא מעוניין ללמוד הייטק',
  'ל"מ - הפסיק באמצע תהליך',
  'א"מ - יום 3 < הפסיק באמצע תהליך',
  'ל"מ - אין יכולת כלכלית',
  'ל"מ - אין שיתוף פעולה',
  'ר"ש - תביעה',
  'ר"ש - מסרב פניות',
  'ר"ש - לקוח בעייתי',
  "ביטל הרשמה - BDI שלילי",
] as const;

/** Characters and separators only: quote marks, dashes, slashes, whitespace. Meaning is never changed. */
export function normalizeStatusLabel(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[״“”]/g, '"')
    .replace(/[׳‘’`]/g, "'")
    .replace(/[\\|\/]/g, "/")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

const CLASSIFICATION = new Map<string, LeadQuality>();
for (const label of GREEN_LEAD_LABELS) CLASSIFICATION.set(normalizeStatusLabel(label), "green");
for (const label of PENDING_LEAD_LABELS) CLASSIFICATION.set(normalizeStatusLabel(label), "pending");
for (const label of RED_LEAD_LABELS) CLASSIFICATION.set(normalizeStatusLabel(label), "red");

/** An empty secondary status is still waiting for a decision, so it counts as pending. */
export function classifyLeadQuality(secondaryStatus: string | null | undefined): LeadQuality {
  if (secondaryStatus === null || secondaryStatus === undefined) return "pending";
  const key = normalizeStatusLabel(secondaryStatus);
  if (key === "") return "pending";
  return CLASSIFICATION.get(key) ?? "unmapped";
}
