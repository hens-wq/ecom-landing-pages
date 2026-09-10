import type { Lead, Sale, SalesMatch } from "@/lib/types";
import { calcTimeToSaleDays, timeToSaleBucket } from "@/lib/calculations";

/**
 * Mock phone-based sale <-> lead matching engine.
 *
 * This stands in for the future Google Sheets integration: today the "sheet" is
 * `mock-data/sales.ts` and matching runs once at build/load time, but the function
 * itself takes plain Sale/Lead arrays and has no UI dependency, so Phase 2 can call
 * it from a real Sheets sync job (or replace it with a smarter engine) without
 * touching the Sales & Matching page.
 *
 * Matching rule (intentionally simple for Phase 1):
 *   1. Find every lead whose normalized phone equals the sale's normalized phone.
 *   2. No candidate -> "unmatched" (e.g. organic sale, or a lead not yet tracked).
 *   3. Exactly one candidate whose first name also matches -> "matched".
 *   4. A phone match with no confident name match (name mismatch, or more than
 *      one lead sharing that phone) -> "needs_review" - flagged for a human
 *      rather than silently attributed.
 */
function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
}

export function matchSaleToLead(sale: Sale, leads: Lead[]): SalesMatch {
  const candidates = leads.filter((lead) => lead.normalizedPhone === sale.normalizedPhone);

  if (candidates.length === 0) {
    return {
      id: `match-${sale.id}`,
      sale,
      lead: null,
      matchStatus: "unmatched",
      leadDate: null,
      timeToSaleDays: null,
      timeToSaleBucket: null,
      campaignId: null,
      campaignName: null,
      adSetId: null,
      adSetName: null,
      adId: null,
      adName: null,
    };
  }

  const confidentMatch =
    candidates.length === 1 && firstNameOf(candidates[0].name) === firstNameOf(sale.customerName)
      ? candidates[0]
      : null;

  const lead = confidentMatch ?? candidates[0];
  const timeToSaleDays = calcTimeToSaleDays(lead.leadDate, sale.saleDate);

  return {
    id: `match-${sale.id}`,
    sale,
    lead,
    matchStatus: confidentMatch ? "matched" : "needs_review",
    leadDate: lead.leadDate,
    timeToSaleDays,
    timeToSaleBucket: timeToSaleBucket(timeToSaleDays),
    campaignId: lead.campaignId,
    campaignName: lead.campaignName,
    adSetId: lead.adSetId,
    adSetName: lead.adSetName,
    adId: lead.adId,
    adName: lead.adName,
  };
}

export function matchSales(sales: Sale[], leads: Lead[]): SalesMatch[] {
  return sales.map((sale) => matchSaleToLead(sale, leads));
}
