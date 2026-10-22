import {
  ENROLLED_MAIN_STATUS,
  isMainStatus,
  isValidSecondaryStatus,
  type LeadStatusRecord,
  type MainStatus,
} from "@/lib/lead-status/types";

/**
 * The one place a status update's business rules are applied - the dashboard's
 * own /api/lead-status route and the CRM webhook both go through here, so the
 * two can never disagree about what a valid status or payment looks like.
 */

export interface StatusUpdateRequest {
  mainStatus: string;
  /** Empty when the sender didn't send one - only allowed for ENROLLED_MAIN_STATUS (see checkStatusRequest). */
  secondaryStatus: string;
  /** undefined = not sent, keep the stored amount. null = explicitly cleared. */
  fullPaymentAmount?: number | null;
  partialPaymentAmount?: number | null;
}

export interface ResolvedStatusUpdate {
  mainStatus: MainStatus;
  secondaryStatus: string;
  fullPaymentAmount: number | null;
  partialPaymentAmount: number | null;
}

export type StatusRuleResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function isPositiveAmount(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * The payment Secondary Status an enrolled lead must show for the amounts it
 * currently has - an entered amount always decides it. Null when neither
 * amount is entered, meaning the lead stays "נרשם".
 */
export function enrolledSecondaryFromPayment(
  fullPaymentAmount: number | null,
  partialPaymentAmount: number | null
): "תשלום מלא" | "תשלום חלקי" | null {
  if (isPositiveAmount(fullPaymentAmount)) return "תשלום מלא";
  if (isPositiveAmount(partialPaymentAmount)) return "תשלום חלקי";
  return null;
}

/**
 * The checks that need only the request itself, so they can run before any
 * database read. A blank Secondary Status is filled in only for "נרשם" - every
 * other status must say what it is, since inventing one would put data the
 * CRM never sent into the dashboard.
 */
export function checkStatusRequest(request: StatusUpdateRequest): StatusRuleResult<{ mainStatus: MainStatus; secondaryStatus: string }> {
  const mainStatus = request.mainStatus.trim();
  if (!isMainStatus(mainStatus)) {
    return { ok: false, error: `סטטוס ראשי לא תקין: "${mainStatus}".` };
  }

  const requested = request.secondaryStatus.trim();
  if (!requested) {
    if (mainStatus !== ENROLLED_MAIN_STATUS) {
      return { ok: false, error: `חובה לשלוח סטטוס משני עבור "${mainStatus}" - המערכת לא משלימה סטטוס משני אלא עבור "נרשם".` };
    }
    return { ok: true, value: { mainStatus, secondaryStatus: ENROLLED_MAIN_STATUS } };
  }

  if (!isValidSecondaryStatus(mainStatus, requested)) {
    return { ok: false, error: `סטטוס משני "${requested}" אינו שייך לסטטוס ראשי "${mainStatus}".` };
  }
  return { ok: true, value: { mainStatus, secondaryStatus: requested } };
}

/**
 * Turns an incoming update into the exact values to store.
 *
 * For an enrolled lead the amounts decide the payment status: an entered
 * amount sets it, and a CRM "נרשם" with no amount never erases a Full or
 * Partial payment already entered in the dashboard - the stored amount is
 * kept, so the status it implies is kept too.
 *
 * A lead carries one payment at a time: if both amounts arrive positive, the
 * one the update asked for is kept and the other is cleared.
 */
export function resolveStatusUpdate(
  request: StatusUpdateRequest,
  existing: LeadStatusRecord | undefined
): StatusRuleResult<ResolvedStatusUpdate> {
  const checked = checkStatusRequest(request);
  if (!checked.ok) return checked;
  const { mainStatus, secondaryStatus: requested } = checked.value;

  let fullPaymentAmount = request.fullPaymentAmount !== undefined ? request.fullPaymentAmount : (existing?.fullPaymentAmount ?? null);
  let partialPaymentAmount =
    request.partialPaymentAmount !== undefined ? request.partialPaymentAmount : (existing?.partialPaymentAmount ?? null);

  if (isPositiveAmount(fullPaymentAmount) && isPositiveAmount(partialPaymentAmount)) {
    if (requested === "תשלום חלקי") fullPaymentAmount = null;
    else partialPaymentAmount = null;
  }

  if (mainStatus !== ENROLLED_MAIN_STATUS) {
    return {
      ok: true,
      value: { mainStatus, secondaryStatus: requested, fullPaymentAmount, partialPaymentAmount },
    };
  }

  if (requested === "תשלום מלא" && !isPositiveAmount(fullPaymentAmount)) {
    return { ok: false, error: "סטטוס 'תשלום מלא' דורש סכום תשלום מלא גדול מאפס." };
  }
  if (requested === "תשלום חלקי" && !isPositiveAmount(partialPaymentAmount)) {
    return { ok: false, error: "סטטוס 'תשלום חלקי' דורש סכום תשלום חלקי גדול מאפס." };
  }

  return {
    ok: true,
    value: {
      mainStatus,
      secondaryStatus: enrolledSecondaryFromPayment(fullPaymentAmount, partialPaymentAmount) ?? ENROLLED_MAIN_STATUS,
      fullPaymentAmount,
      partialPaymentAmount,
    },
  };
}
