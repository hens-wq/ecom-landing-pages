/**
 * Ratings Fireberry recorded while the sync automation was off, taken from one export. The whole export carries ONE
 * time: exportedAt, the moment the export was taken. Each row is the rating as it stood at that moment. Pure: no I/O.
 *
 * Why the export time and not a record's modified date: Fireberry's modified date changes with any edit to the
 * record, so it does not show when the rating changed. The export time is the only time known for sure. A rating
 * written live after the export supersedes the export row; one written before it does not.
 *
 * A row needs: a rating as the automation sends it (pcfsystemfield350 = the raw code 6-10, or studentRating = 1-5),
 * and an identity: leadId (the Meta Lead ID as a string) and/or phone. An empty rating is refused: an import never
 * clears a rating. A row with a time field of its own is refused, so no record's own date can become a rating's time.
 */
import { normalizeIsraeliPhone } from "@/lib/phone";
import { parseStudentRatingUpdate } from "@/lib/lead-status/student-rating";
import { pendingDedupeKey, type NewPendingUpdate } from "@/lib/lead-status/pending-core";

/** Row fields that would carry a time of their own. They are refused. */
const TIME_FIELDS = ["changedAt", "modifiedAt", "modifiedOn", "updatedAt"] as const;

export interface ImportValidRow {
  /** The row's position in the request (0-based), for the reply. */
  index: number;
  update: NewPendingUpdate;
}

export interface ImportParseResult {
  valid: ImportValidRow[];
  invalid: { index: number; error: string }[];
}

export function parseImportRows(rows: unknown[], exportedAt: Date): ImportParseResult {
  const result: ImportParseResult = { valid: [], invalid: [] };
  rows.forEach((raw, index) => {
    const refuse = (error: string) => result.invalid.push({ index, error });
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return refuse("השורה אינה אובייקט JSON.");
    const row = raw as Record<string, unknown>;

    if (TIME_FIELDS.some((field) => row[field] !== undefined)) {
      return refuse("שורה עם שדה זמן משלה אינה נתמכת. הזמן של כל הייבוא הוא exportedAt בלבד.");
    }

    const leadId = typeof row.leadId === "string" && row.leadId.trim() ? row.leadId.trim() : null;
    const phone =
      (typeof row.phone === "string" && row.phone.trim()) || (typeof row.phone === "number" && Number.isFinite(row.phone))
        ? (row.phone as string | number)
        : null;
    const normalizedPhone = phone === null ? null : normalizeIsraeliPhone(String(phone)) || null;
    if (leadId === null && normalizedPhone === null) return refuse("חסר מזהה: leadId או טלפון.");

    const ratingInput: { pcfsystemfield350?: unknown; studentRating?: unknown } = {};
    if (row.pcfsystemfield350 !== undefined) ratingInput.pcfsystemfield350 = row.pcfsystemfield350;
    if (row.studentRating !== undefined) ratingInput.studentRating = row.studentRating;
    const rating = parseStudentRatingUpdate(ratingInput);
    if (!rating.ok) return refuse(rating.error);
    if (!rating.provided) return refuse("אין דירוג בשורה (pcfsystemfield350 או studentRating).");
    if (rating.value === null) return refuse("הדירוג בשורה ריק. ייבוא אינו מנקה דירוגים, והשורה לא יובאה.");

    const payload = { studentRating: rating.value };
    result.valid.push({
      index,
      update: {
        dedupeKey: pendingDedupeKey({ leadIdHint: leadId, normalizedPhone, kind: "rating", payload }),
        reason: "imported",
        kind: "rating",
        leadIdHint: leadId,
        normalizedPhone,
        payload,
        sourceAt: exportedAt,
      },
    });
  });
  return result;
}
