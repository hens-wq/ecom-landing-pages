import { isMainStatus, isValidSecondaryStatus, type LeadStatusRecord } from "@/lib/lead-status/types";

export interface LeadStatusUpdateInput {
  mainStatus: string;
  secondaryStatus: string;
  /** Undefined = "not being changed by this update" (falls back to `existing`); null = "explicitly cleared". */
  fullPaymentAmount?: number | null;
  partialPaymentAmount?: number | null;
}

export type ValidationResult = { ok: true } | { ok: false; error: string };

function isPositiveAmount(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * The one place that enforces the status hierarchy and the payment/sale
 * business rules from the spec - called from the API route (the trust
 * boundary for anything reaching the repository). `existing` lets a client
 * change just the status without re-sending an amount that was already
 * saved on a previous edit (see LeadStatusRecord's doc comment on why both
 * amount fields are always kept even when only one is "active").
 */
export function validateStatusUpdate(input: LeadStatusUpdateInput, existing: LeadStatusRecord | undefined): ValidationResult {
  if (!isMainStatus(input.mainStatus)) {
    return { ok: false, error: `סטטוס ראשי לא תקין: "${input.mainStatus}".` };
  }
  if (!isValidSecondaryStatus(input.mainStatus, input.secondaryStatus)) {
    return { ok: false, error: `סטטוס משני "${input.secondaryStatus}" אינו שייך לסטטוס ראשי "${input.mainStatus}".` };
  }

  if (input.mainStatus === "נרשם") {
    const fullAmount = input.fullPaymentAmount !== undefined ? input.fullPaymentAmount : (existing?.fullPaymentAmount ?? null);
    const partialAmount =
      input.partialPaymentAmount !== undefined ? input.partialPaymentAmount : (existing?.partialPaymentAmount ?? null);

    if (input.secondaryStatus === "תשלום מלא" && !isPositiveAmount(fullAmount)) {
      return { ok: false, error: "סטטוס 'תשלום מלא' דורש סכום תשלום מלא גדול מאפס." };
    }
    if (input.secondaryStatus === "תשלום חלקי" && !isPositiveAmount(partialAmount)) {
      return { ok: false, error: "סטטוס 'תשלום חלקי' דורש סכום תשלום חלקי גדול מאפס." };
    }
  }

  return { ok: true };
}
