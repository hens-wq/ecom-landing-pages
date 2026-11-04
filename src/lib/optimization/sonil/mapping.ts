import { ACTION_CODES, type ActionCode } from "@/lib/optimization/labels";

/**
 * The mapping the person confirms: which column of the file holds which field, and which action each recommendation text
 * stands for. Nothing here is guessed from a column name. An unmapped field is null.
 */

export const MAPPING_ROLES = ["campaignId", "adSetId", "adId", "date", "spend", "leads", "recommendation"] as const;
export type MappingRole = (typeof MAPPING_ROLES)[number];
export type SonilMapping = Record<MappingRole, number | null>;

export const ROLE_LABELS: Record<MappingRole, string> = {
  campaignId: "מזהה קמפיין",
  adSetId: "מזהה Ad Set",
  adId: "מזהה מודעה",
  date: "תאריך",
  spend: "הוצאה",
  leads: "לידים",
  recommendation: "המלצת סוניל",
};

/** A recommendation text that the person has not mapped to an action yet. */
export const UNMAPPED = "unmapped";
export type ValueAction = ActionCode | typeof UNMAPPED;
/** Keyed by the normalized recommendation text. */
export type ValueMap = Record<string, ValueAction>;

export function emptyMapping(): SonilMapping {
  return { campaignId: null, adSetId: null, adId: null, date: null, spend: null, leads: null, recommendation: null };
}

/** Whitespace collapsed and trimmed, so the same text in two cells is one value. */
export function normalizeRecommendationText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** The problems that stop a mapping from being used. An empty list means it can be used. */
export function mappingProblems(mapping: SonilMapping, columnCount: number): string[] {
  const problems: string[] = [];
  const used = new Map<number, MappingRole>();
  for (const role of MAPPING_ROLES) {
    const column = mapping[role];
    if (column === null) continue;
    if (!Number.isInteger(column) || column < 0 || column >= columnCount) {
      problems.push(`העמודה שמופתה ל${ROLE_LABELS[role]} אינה קיימת בקובץ.`);
      continue;
    }
    const other = used.get(column);
    if (other) problems.push(`אותה עמודה ממופה גם ל${ROLE_LABELS[other]} וגם ל${ROLE_LABELS[role]}.`);
    else used.set(column, role);
  }
  if (mapping.recommendation === null) problems.push("חובה למפות את עמודת המלצת סוניל: בלעדיה אין מה להשוות.");
  if (mapping.campaignId === null && mapping.adSetId === null && mapping.adId === null) {
    problems.push("חובה למפות לפחות מזהה אחד: קמפיין, Ad Set או מודעה.");
  }
  return problems;
}

/** Reads a mapping sent by the browser. Anything that is not a column number or null is refused. */
export function parseMapping(input: unknown): SonilMapping | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  const mapping = emptyMapping();
  for (const role of MAPPING_ROLES) {
    const value = record[role];
    if (value === null || value === undefined) continue;
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) return null;
    mapping[role] = value;
  }
  return mapping;
}

/** Reads the value map sent by the browser. Every value must be an action code or "unmapped". */
export function parseValueMap(input: unknown): ValueMap | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const result: ValueMap = {};
  for (const [text, action] of Object.entries(input as Record<string, unknown>)) {
    if (typeof action !== "string") return null;
    if (action !== UNMAPPED && !(ACTION_CODES as readonly string[]).includes(action)) return null;
    if (text.length > 500) return null;
    result[normalizeRecommendationText(text)] = action as ValueAction;
  }
  return result;
}
