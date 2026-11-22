/**
 * Ratings Fireberry recorded while the sync automation was off. An export of those records becomes pending rating
 * updates, with the time Fireberry recorded for each change as their source time. They are then applied by the same
 * replay and the same matching rules as any other pending update. Pure: no I/O.
 *
 * Each row needs: changedAt (ISO 8601: when the rating was set in Fireberry), a rating as the automation sends it
 * (pcfsystemfield350 = the raw Picklist code 6-10, or studentRating = 1-5), and an identity: leadId (the Meta Lead
 * ID, as a string) and/or phone. A row without a usable time is refused, never given a guessed one.
 * An empty rating is refused too: an import never clears a rating. Export rows without a rating are skipped, not imported as a clear.
 */
import { normalizeIsraeliPhone } from "@/lib/phone";
import { parseStudentRatingUpdate } from "@/lib/lead-status/student-rating";
import { pendingDedupeKey, type NewPendingUpdate } from "@/lib/lead-status/pending-core";

/** A small allowance for a clock that runs ahead. Anything later is a bad time, not a future change. */
const FUTURE_ALLOWANCE_MS = 24 * 60 * 60 * 1000;

export interface ImportParseResult {
  valid: NewPendingUpdate[];
  invalid: { index: number; error: string }[];
}

export function parseImportRows(rows: unknown[], now: Date): ImportParseResult {
  const result: ImportParseResult = { valid: [], invalid: [] };
  rows.forEach((raw, index) => {
    const refuse = (error: string) => result.invalid.push({ index, error });
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return refuse("השורה אינה אובייקט JSON.");
    const row = raw as Record<string, unknown>;

    if (typeof row.changedAt !== "string" || !row.changedAt.trim()) return refuse("חסר changedAt (תאריך ISO של שינוי הדירוג ב-Fireberry).");
    const changedAt = new Date(row.changedAt.trim());
    if (Number.isNaN(changedAt.getTime())) return refuse("changedAt אינו תאריך ISO תקין.");
    if (changedAt.getTime() > now.getTime() + FUTURE_ALLOWANCE_MS) return refuse("changedAt נמצא בעתיד.");

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
      dedupeKey: pendingDedupeKey({ leadIdHint: leadId, normalizedPhone, kind: "rating", payload }),
      reason: "imported",
      kind: "rating",
      leadIdHint: leadId,
      normalizedPhone,
      payload,
      sourceAt: changedAt,
    });
  });
  return result;
}
