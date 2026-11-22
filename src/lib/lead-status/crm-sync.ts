import type { LeadStatusRecord } from "@/lib/lead-status/types";
import { checkStatusRequest, resolveStatusUpdate, type StatusUpdateRequest } from "@/lib/lead-status/validation";
import { parseStudentRatingUpdate, type StudentRating } from "@/lib/lead-status/student-rating";
import { isValidIsraeliPhone, normalizeIsraeliPhone } from "@/lib/phone";

/**
 * CRM -> dashboard status sync. Pure on purpose: the lead index and the status
 * store are passed in, so the matching rules are testable without a database.
 *
 * A lead is identified only by its Meta Lead ID (when it's a lead this dashboard
 * knows) or by its normalized phone. A lead's name is never used - sales reps
 * edit names in the CRM.
 */

export interface DashboardLeadInfo {
  /** The dashboard's lead ID: the Meta Lead ID, or the internal ID of a landing-page lead. */
  id: string;
  name: string | null;
  phone: string | null;
  normalizedPhone: string | null;
  /**
   * The phone a CRM update is matched against. It can be found under another question than the standard phone
   * field (see lib/leads/meta/field-data.ts). Absent, it is the same as normalizedPhone. Display never reads it.
   */
  matchPhone?: string | null;
  /** Calendar date the lead was created in Asia/Jerusalem, "YYYY-MM-DD". */
  createdDate: string;
}

function matchPhoneOf(info: DashboardLeadInfo): string | null {
  return info.matchPhone ?? info.normalizedPhone;
}

export interface DashboardLeadIndex {
  byId: Map<string, DashboardLeadInfo>;
  /** False when the Meta lead list couldn't be read. Meta leads can't then be verified by ID or matched by phone. */
  metaAvailable: boolean;
}

export interface CrmStatusStore {
  get(leadId: string): Promise<LeadStatusRecord | undefined>;
  findLeadIdsByNormalizedPhone(normalizedPhone: string): Promise<string[]>;
  upsert(
    leadId: string,
    patch: {
      mainStatus: string;
      secondaryStatus: string;
      normalizedPhone?: string | null;
      fullPaymentAmount?: number | null;
      partialPaymentAmount?: number | null;
      studentRating?: StudentRating | null;
    }
  ): Promise<LeadStatusRecord>;
  /** Atomic rating-only write: existing statuses and payment amounts must remain untouched. */
  upsertStudentRating(leadId: string, studentRating: StudentRating | null, normalizedPhone?: string | null): Promise<LeadStatusRecord & { previousStudentRating?: StudentRating | null }>;
}

export interface CrmSyncInput {
  leadId?: string | null;
  phone?: string | number | null;
  mainStatus?: string;
  secondaryStatus?: string;
  fullPaymentAmount?: number | null;
  partialPaymentAmount?: number | null;
  studentRating?: StudentRating | null;
}

export type CrmLeadMatch =
  | { ok: true; leadId: string; matchedBy: "lead_id" | "phone"; normalizedPhone: string | null }
  | { ok: false; status: 400 | 404 | 409; code: "invalid_request" | "invalid_phone" | "not_found" | "ambiguous"; message: string };

export type CrmSyncResult =
  | { ok: true; leadId: string; matchedBy: "lead_id" | "phone"; record: LeadStatusRecord; previous: LeadStatusRecord | undefined }
  | { ok: false; status: 400 | 404 | 409; code: "invalid_request" | "invalid_phone" | "not_found" | "ambiguous"; message: string };

function canonicalPhone(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return normalizeIsraeliPhone(String(value));
}

/**
 * Priority: an exact Meta Lead ID the dashboard knows, then the normalized
 * phone. A phone that matches more than one lead is refused rather than
 * guessed at - the wrong person must never be updated.
 */
export async function matchCrmLead(
  input: { leadId?: string | null; phone?: string | number | null },
  index: DashboardLeadIndex,
  store: Pick<CrmStatusStore, "findLeadIdsByNormalizedPhone">
): Promise<CrmLeadMatch> {
  const leadId = typeof input.leadId === "string" ? input.leadId.trim() : "";
  if (leadId) {
    const known = index.byId.get(leadId);
    if (known) {
      const knownPhone = matchPhoneOf(known);
      return {
        ok: true,
        leadId,
        matchedBy: "lead_id",
        normalizedPhone: knownPhone ? canonicalPhone(knownPhone) || null : null,
      };
    }
  }

  const phone = canonicalPhone(input.phone);
  if (!phone) {
    return {
      ok: false,
      status: 404,
      code: "not_found",
      message: leadId
        ? "לא נמצא ליד תואם ל-leadId שנשלח, ולא נשלח טלפון לחיפוש. לא בוצע עדכון."
        : "לא נשלח leadId או טלפון לזיהוי הליד. לא בוצע עדכון.",
    };
  }
  if (!isValidIsraeliPhone(phone)) {
    return { ok: false, status: 400, code: "invalid_phone", message: "מספר הטלפון אינו תקין. לא בוצע עדכון." };
  }

  const candidates = new Set<string>();
  for (const info of index.byId.values()) {
    const candidatePhone = matchPhoneOf(info);
    if (candidatePhone && canonicalPhone(candidatePhone) === phone) candidates.add(info.id);
  }
  for (const id of await store.findLeadIdsByNormalizedPhone(phone)) candidates.add(id);

  if (candidates.size === 1) {
    return { ok: true, leadId: [...candidates][0], matchedBy: "phone", normalizedPhone: phone };
  }
  if (candidates.size > 1) {
    return {
      ok: false,
      status: 409,
      code: "ambiguous",
      message: `נמצאו ${candidates.size} לידים עם מספר הטלפון הזה - לא ניתן לדעת איזה מהם לעדכן. לא בוצע עדכון.`,
    };
  }
  return {
    ok: false,
    status: 404,
    code: "not_found",
    message: index.metaAvailable
      ? "לא נמצא ליד תואם לא ל-Meta Lead ID ולא לטלפון. לא בוצע עדכון."
      : "לא נמצא ליד תואם לטלפון, וקריאת הלידים מ-Meta אינה זמינה כרגע. לא בוצע עדכון.",
  };
}

/**
 * Matches the lead first, then writes its status under the matched lead's own
 * ID only - never under an ID the sender supplied without verifying it. That's
 * what keeps a single lead to a single status row.
 */
export type CrmSyncRequestCheck =
  | { ok: true; statusRequest: StatusUpdateRequest | null; studentRating: StudentRating | null | undefined }
  | { ok: false; error: string };

/** Shared by the authenticated webhook and the pure sync function; validates before any lead or database read. */
export function checkCrmSyncRequest(input: CrmSyncInput): CrmSyncRequestCheck {
  const rating = parseStudentRatingUpdate({ studentRating: input.studentRating });
  if (!rating.ok) return rating;
  const hasStatus = input.mainStatus !== undefined || input.secondaryStatus !== undefined;
  if (!hasStatus) {
    if (!rating.provided) return { ok: false, error: "יש לשלוח עדכון סטטוס או דירוג תלמיד. לא בוצע עדכון." };
    if (input.fullPaymentAmount !== undefined || input.partialPaymentAmount !== undefined) {
      return { ok: false, error: "עדכון תשלום דורש גם סטטוס ראשי ומשני; עדכון דירוג בלבד אינו משנה תשלומים." };
    }
    return { ok: true, statusRequest: null, studentRating: rating.value };
  }
  const statusRequest: StatusUpdateRequest = {
    mainStatus: input.mainStatus ?? "",
    secondaryStatus: input.secondaryStatus ?? "",
    fullPaymentAmount: input.fullPaymentAmount,
    partialPaymentAmount: input.partialPaymentAmount,
  };
  const checked = checkStatusRequest(statusRequest);
  return checked.ok ? { ok: true, statusRequest, studentRating: rating.value } : checked;
}

export async function syncCrmStatus(input: CrmSyncInput, index: DashboardLeadIndex, store: CrmStatusStore): Promise<CrmSyncResult> {
  const requestCheck = checkCrmSyncRequest(input);
  if (!requestCheck.ok) return { ok: false, status: 400, code: "invalid_request", message: requestCheck.error };
  const match = await matchCrmLead(input, index, store);
  if (!match.ok) return match;

  if (requestCheck.statusRequest === null) {
    // The write stays atomic (only the rating field). The prior record is read only so the CRM can tell
    // whether this rating crossed a qualification threshold.
    const { previousStudentRating, ...record } = await store.upsertStudentRating(match.leadId, requestCheck.studentRating!, match.normalizedPhone ?? undefined);
    // The prior rating comes back from the same atomic statement, so no extra read is made.
    const previous = previousStudentRating === undefined ? undefined : { ...record, studentRating: previousStudentRating };
    return { ok: true, leadId: match.leadId, matchedBy: match.matchedBy, record, previous };
  }
  const existing = await store.get(match.leadId);
  const resolved = resolveStatusUpdate(requestCheck.statusRequest, existing);
  if (!resolved.ok) return { ok: false, status: 400, code: "invalid_request", message: resolved.error };
  const record = await store.upsert(match.leadId, {
    mainStatus: resolved.value.mainStatus,
    secondaryStatus: resolved.value.secondaryStatus,
    normalizedPhone: match.normalizedPhone ?? undefined,
    fullPaymentAmount: resolved.value.fullPaymentAmount,
    partialPaymentAmount: resolved.value.partialPaymentAmount,
    studentRating: requestCheck.studentRating,
  });
  return { ok: true, leadId: match.leadId, matchedBy: match.matchedBy, record, previous: existing };
}
