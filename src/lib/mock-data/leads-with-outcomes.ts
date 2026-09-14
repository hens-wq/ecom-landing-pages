import { leads as baseLeads } from "@/lib/mock-data/leads";
import { salesMatches } from "@/lib/mock-data/sales-matches";
import type { Lead } from "@/lib/types";

/**
 * Enriches each base lead with its sale outcome, derived from the matching
 * engine's own decisions rather than hand-authored a second time. A lead is
 * "sold" if and only if it is the specific lead a `matched` SalesMatch was
 * attributed to (see lib/matching.ts) - when a phone number has multiple leads,
 * only the one actually credited ends up "sold"; the others stay "not_sold",
 * exactly reflecting that they were kept on file but didn't get the credit.
 */
const outcomeByLeadId = new Map<
  string,
  Pick<Lead, "saleDate" | "saleAmount" | "timeToSaleMinutes" | "timeToSaleDays" | "timeToSaleBucket">
>();

for (const match of salesMatches) {
  if (match.matchStatus === "matched" && match.lead) {
    outcomeByLeadId.set(match.lead.id, {
      saleDate: match.sale.saleDate,
      saleAmount: match.sale.saleAmount,
      timeToSaleMinutes: match.timeToSaleMinutes,
      timeToSaleDays: match.timeToSaleDays,
      timeToSaleBucket: match.timeToSaleBucket,
    });
  }
}

export const leads: Lead[] = baseLeads.map((lead) => {
  const outcome = outcomeByLeadId.get(lead.id);
  if (!outcome) return lead;
  return { ...lead, saleStatus: "sold", ...outcome };
});

export function findLeadById(leadId: string) {
  return leads.find((lead) => lead.id === leadId);
}
