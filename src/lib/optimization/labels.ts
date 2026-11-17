/** Hebrew labels, tones and priorities for the optimization center. Pure and shared by the engine, the API and the UI. */

export const ACTION_CODES = ["KEEP", "WATCH", "WARNING", "PAUSE_CANDIDATE", "PAUSE", "SCALE_CANDIDATE", "TEST", "FIX", "CHECK_DATA"] as const;
export type ActionCode = (typeof ACTION_CODES)[number];

/**
 * PAUSE (direct) is part of the spec's action list, but no rule in this version emits it: every rule that could pause
 * stops at PAUSE CANDIDATE, so a person decides. The label is kept so a later rule can use it without a UI change.
 * CHECK DATA is not a performance verdict: it names a data gap (for example, leads with no attribution ID) to check first.
 */
export const ACTION_LABELS: Record<ActionCode, string> = {
  KEEP: "להשאיר (KEEP)",
  WATCH: "לעקוב (WATCH)",
  WARNING: "אזהרה (WARNING)",
  PAUSE_CANDIDATE: "מועמד להשהיה (PAUSE CANDIDATE)",
  PAUSE: "להשהות (PAUSE)",
  SCALE_CANDIDATE: "מועמד להגדלה (SCALE CANDIDATE)",
  TEST: "לבדוק / לנסות (TEST)",
  FIX: "לתקן (FIX)",
  CHECK_DATA: "לבדוק נתונים (CHECK DATA)",
};

export type Tone = "positive" | "watch" | "problem" | "info" | "insufficient";

/** Spec colours: Green = positive, Orange = watch, Red = problem, Blue = information/action, Gray = insufficient data. */
export const TONE_LABELS: Record<Tone, string> = {
  positive: "תקין",
  watch: "מעקב",
  problem: "בעיה",
  info: "מידע / פעולה",
  insufficient: "אין מספיק נתונים",
};

export function toneForAction(action: ActionCode): Tone {
  switch (action) {
    case "KEEP":
    case "SCALE_CANDIDATE":
      return "positive";
    case "WATCH":
      return "watch";
    case "WARNING":
    case "PAUSE_CANDIDATE":
    case "PAUSE":
      return "problem";
    case "TEST":
    case "FIX":
    case "CHECK_DATA":
      return "info";
  }
}

export const PRIORITY_LABELS: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8, string> = {
  1: "מעקב ותקינות נתונים",
  2: "איכות לידים אדומה",
  3: "CPA / מכירות",
  4: "CPL",
  5: "נפח ואספקה",
  6: "תדירות וקריאייטיב",
  7: "ריכוז תקציב",
  8: "הגדלה (Scale)",
};

export const LEVEL_LABELS = { campaign: "קמפיין", adset: "Ad Set", ad: "מודעה" } as const;

export const CONFIDENCE_LABELS = {
  high: "ביטחון גבוה",
  medium: "ביטחון בינוני",
  low: "ביטחון נמוך (מדגם קטן)",
} as const;

export const ACTION_STATUS_VALUES = ["pending", "done", "not_done"] as const;
export type ActionStatus = (typeof ACTION_STATUS_VALUES)[number];

/** Documentation only: "בוצע" records what a person did in Meta. It never sends an instruction to Meta. */
export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  pending: "ממתין",
  done: "בוצע",
  not_done: "לא מבצע",
};

export function parseActionStatus(value: unknown): ActionStatus | null {
  return typeof value === "string" && (ACTION_STATUS_VALUES as readonly string[]).includes(value) ? (value as ActionStatus) : null;
}
