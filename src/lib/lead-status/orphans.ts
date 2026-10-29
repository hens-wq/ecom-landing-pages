import type { DashboardLeadInfo } from "@/lib/lead-status/crm-sync";
import { isPositiveAmount } from "@/lib/lead-status/validation";
import { isValidIsraeliPhone, normalizeIsraeliPhone } from "@/lib/phone";

/**
 * Status rows that no real dashboard lead accounts for: no Meta Lead ID, landing
 * lead ID or normalized phone of any lead the dashboard knows. Typically left
 * behind when a CRM update arrived under an ID that wasn't the dashboard's.
 *
 * A row holding a payment amount is never classed as deletable, however it got
 * there - manual payment data is kept, and only reported.
 */

export interface StatusRowForClassification {
  leadId: string;
  normalizedPhone: string | null;
  fullPaymentAmount: number | null;
  partialPaymentAmount: number | null;
}

export interface OrphanClassification {
  /** Matches no real lead and holds no payment amount. Safe to delete. */
  deletable: string[];
  /** Matches no real lead but holds a payment amount. Kept. */
  keptWithPayment: string[];
  /** Matches a real lead by ID or by phone. Never touched. */
  matched: number;
}

export function classifyStatusRows(
  rows: StatusRowForClassification[],
  realLeads: Map<string, DashboardLeadInfo>
): OrphanClassification {
  const realPhones = new Set<string>();
  for (const lead of realLeads.values()) {
    if (!lead.normalizedPhone) continue;
    const phone = normalizeIsraeliPhone(lead.normalizedPhone);
    if (isValidIsraeliPhone(phone)) realPhones.add(phone);
  }

  const result: OrphanClassification = { deletable: [], keptWithPayment: [], matched: 0 };
  for (const row of rows) {
    const matchedById = realLeads.has(row.leadId);
    const rowPhone = row.normalizedPhone ? normalizeIsraeliPhone(row.normalizedPhone) : "";
    const matchedByPhone = isValidIsraeliPhone(rowPhone) && realPhones.has(rowPhone);

    if (matchedById || matchedByPhone) {
      result.matched++;
    } else if (isPositiveAmount(row.fullPaymentAmount) || isPositiveAmount(row.partialPaymentAmount)) {
      result.keptWithPayment.push(row.leadId);
    } else {
      result.deletable.push(row.leadId);
    }
  }
  return result;
}

export interface DeletionPlan {
  toDelete: string[];
  skipped: Array<{ leadId: string; reason: "not_orphan" | "has_payment" }>;
}

/**
 * Only IDs the caller asked for, and still deletable at this moment, are deleted.
 * Anything else is reported back with the reason it was skipped.
 */
export function planOrphanDeletion(requestedIds: string[], current: OrphanClassification): DeletionPlan {
  const deletable = new Set(current.deletable);
  const keptWithPayment = new Set(current.keptWithPayment);
  const plan: DeletionPlan = { toDelete: [], skipped: [] };
  for (const leadId of new Set(requestedIds)) {
    if (deletable.has(leadId)) plan.toDelete.push(leadId);
    else plan.skipped.push({ leadId, reason: keptWithPayment.has(leadId) ? "has_payment" : "not_orphan" });
  }
  return plan;
}
