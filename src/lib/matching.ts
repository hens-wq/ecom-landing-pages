import type { Lead, Sale, SalesMatch } from "@/lib/types";
import { calcTimeToSaleMinutes, timeToSaleBucket, timeToSaleDaysFromMinutes } from "@/lib/calculations";
import { hasNameMismatch } from "@/lib/name-match";

/**
 * Mock phone-based sale <-> lead matching engine.
 *
 * This stands in for the future Google Sheets integration: today the "sheet" is
 * `mock-data/sales.ts` and matching runs once at build/load time, but the function
 * itself takes plain Sale/Lead arrays and has no UI dependency, so Phase 2 can call
 * it from a real Sheets sync job (or replace it with a smarter engine) without
 * touching the Sales & Matching page.
 *
 * Matching rule:
 *   1. Normalized phone number is the ONLY thing that decides whether a lead is a
 *      candidate for a sale. Customer name is never required to match - it's
 *      stored and displayed for context, but a name spelled differently (a
 *      nickname, a spouse's name on the invoice) never turns a valid phone match
 *      into "needs review". A name that looks like a different person still gets
 *      surfaced, just as a non-blocking `nameMismatch` flag (see
 *      lib/name-match.ts) - informational only, never part of this decision.
 *   2. A phone number can have submitted multiple leads over time (see leads.ts -
 *      they are never deduplicated). Among every lead sharing the sale's phone,
 *      attribute the sale to the MOST RECENT lead dated at or before the sale.
 *      This is `pickAttributedLead` below - change the rule by editing that one
 *      function, nothing else needs to know how attribution is decided.
 *   3. No lead at all shares the phone -> "unmatched".
 *   4. The phone is recognized, but every lead on file for it is dated AFTER the
 *      sale (so there is no valid "prior lead" to credit) -> "needs_review". This
 *      is a data problem worth a human look, not a guess.
 */

/** Among candidates sharing a phone, the most recent lead at or before the sale date - or null if none qualify. */
function pickAttributedLead(candidates: Lead[], saleDateIso: string): Lead | null {
  const saleTime = new Date(saleDateIso).getTime();
  const priorLeads = candidates.filter((lead) => new Date(lead.leadDate).getTime() <= saleTime);
  if (priorLeads.length === 0) return null;

  return priorLeads.reduce((mostRecent, lead) =>
    new Date(lead.leadDate).getTime() > new Date(mostRecent.leadDate).getTime() ? lead : mostRecent
  );
}

function earliestLead(candidates: Lead[]): Lead {
  return candidates.reduce((earliest, lead) =>
    new Date(lead.leadDate).getTime() < new Date(earliest.leadDate).getTime() ? lead : earliest
  );
}

function buildMatch(sale: Sale, lead: Lead | null, matchStatus: SalesMatch["matchStatus"]): SalesMatch {
  const attribution = {
    leadDate: lead?.leadDate ?? null,
    sourceType: lead?.sourceType ?? null,
    nameMismatch: lead ? hasNameMismatch(lead.name, sale.customerName) : false,
    campaignId: lead?.campaignId ?? null,
    campaignName: lead?.campaignName ?? null,
    adSetId: lead?.adSetId ?? null,
    adSetName: lead?.adSetName ?? null,
    adId: lead?.adId ?? null,
    adName: lead?.adName ?? null,
  };

  // Time-to-sale only makes sense when we actually attributed the sale to a lead
  // that precedes it - a "needs review" reference lead dated after the sale would
  // otherwise produce a nonsensical negative duration.
  if (!lead || matchStatus !== "matched") {
    return {
      id: `match-${sale.id}`,
      sale,
      lead,
      matchStatus,
      ...attribution,
      timeToSaleMinutes: null,
      timeToSaleDays: null,
      timeToSaleBucket: null,
    };
  }

  const minutes = calcTimeToSaleMinutes(lead.leadDate, sale.saleDate);
  return {
    id: `match-${sale.id}`,
    sale,
    lead,
    matchStatus,
    ...attribution,
    timeToSaleMinutes: minutes,
    timeToSaleDays: timeToSaleDaysFromMinutes(minutes),
    timeToSaleBucket: timeToSaleBucket(minutes),
  };
}

export function matchSaleToLead(sale: Sale, leads: Lead[]): SalesMatch {
  const candidates = leads.filter((lead) => lead.normalizedPhone === sale.normalizedPhone);

  if (candidates.length === 0) {
    return buildMatch(sale, null, "unmatched");
  }

  const attributed = pickAttributedLead(candidates, sale.saleDate);
  if (!attributed) {
    return buildMatch(sale, earliestLead(candidates), "needs_review");
  }

  return buildMatch(sale, attributed, "matched");
}

export function matchSales(sales: Sale[], leads: Lead[]): SalesMatch[] {
  return sales.map((sale) => matchSaleToLead(sale, leads));
}
