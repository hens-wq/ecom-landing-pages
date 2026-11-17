/** Fireberry "דירוג תלמיד" Picklist. Verified raw option IDs are NOT the flame count. */
export const FIREBERRY_STUDENT_RATING_FIELD = "pcfsystemfield350" as const;
export type StudentRating = 1 | 2 | 3 | 4 | 5;
export const FIREBERRY_STUDENT_RATINGS: Readonly<Record<number, StudentRating>> = { 6: 1, 7: 2, 8: 3, 9: 4, 10: 5 };

/** Business display/reporting baseline: a missing CRM rating means two flames. Raw storage remains unchanged. */
export function effectiveStudentRating(rating: number | null | undefined): number {
  return rating ?? 2;
}

export function isStudentRating(value: unknown): value is StudentRating {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

export type StudentRatingUpdate =
  | { ok: true; provided: false; value: undefined }
  | { ok: true; provided: true; value: StudentRating | null }
  | { ok: false; error: string };

type RatingValue = { ok: true; value: StudentRating | null } | { ok: false };

/** The normal Fireberry field reference can send the visible Picklist label instead of its numeric API ID. */
function parseFireberryRatingLabel(value: unknown): RatingValue {
  if (typeof value !== "string" || value.length > 100) return { ok: false };
  const label = value.replace(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069\ufe0f]/g, "").trim();
  const flames = label.match(/🔥/gu)?.length ?? 0;
  const digits = label.match(/\d+/g) ?? [];
  if (!isStudentRating(flames) || digits.length !== 1 || digits[0] !== String(flames)) return { ok: false };
  const remaining = label.replace(/🔥/gu, "").replace(/[1-5]/g, "").replace(/[\s\-–—]/g, "");
  if (remaining !== "" && !(flames === 1 && remaining === "קר") && !(flames === 5 && remaining === "לוהט")) return { ok: false };
  return { ok: true, value: flames };
}

function parseValue(value: unknown, raw: boolean): RatingValue {
  if (value === null) return { ok: true, value: null };
  const pattern = raw ? /^(?:[6-9]|10)$/ : /^[1-5]$/;
  const parsed = typeof value === "string" && pattern.test(value.trim()) ? Number(value.trim()) : value;
  if (raw) {
    if (typeof parsed !== "number" || !Number.isInteger(parsed) || parsed < 6 || parsed > 10) return parseFireberryRatingLabel(value);
    return { ok: true, value: FIREBERRY_STUDENT_RATINGS[parsed] };
  }
  return isStudentRating(parsed) ? { ok: true, value: parsed } : { ok: false };
}

/** Omitted/undefined preserves the current rating; only explicit null clears. No default rating is ever invented. */
export function parseStudentRatingUpdate(payload: { studentRating?: unknown; pcfsystemfield350?: unknown }): StudentRatingUpdate {
  const canonicalPresent = payload.studentRating !== undefined;
  const rawPresent = payload.pcfsystemfield350 !== undefined;
  if (!canonicalPresent && !rawPresent) return { ok: true, provided: false, value: undefined };
  const canonical = canonicalPresent ? parseValue(payload.studentRating, false) : null;
  const raw = rawPresent ? parseValue(payload.pcfsystemfield350, true) : null;
  if ((canonical && !canonical.ok) || (raw && !raw.ok)) {
    return { ok: false, error: "דירוג תלמיד אינו תקין: studentRating חייב להיות 1–5, או pcfsystemfield350 חייב להיות קוד 6–10 או תווית להבות תואמת. לניקוי יש לשלוח null מפורש." };
  }
  if (canonical?.ok && raw?.ok && canonical.value !== raw.value) {
    return { ok: false, error: "נשלחו ערכי דירוג סותרים ב-studentRating וב-pcfsystemfield350. לא בוצע עדכון." };
  }
  const chosen = canonical?.ok ? canonical : raw;
  return chosen?.ok ? { ok: true, provided: true, value: chosen.value } : { ok: false, error: "דירוג תלמיד אינו תקין." };
}

/** Database values may arrive as strings; invalid or absent values remain unrated, never 0 or a default 2. */
export function storedStudentRating(value: unknown): StudentRating | null {
  const parsed = parseValue(value, false);
  return parsed.ok ? parsed.value : null;
}
