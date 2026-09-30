import type { LeadColumnKey } from "@/components/leads/lead-columns";
import type { MetaFormLead } from "@/lib/leads";
import type { LeadStatusRecord } from "@/lib/lead-status/types";

export type LeadSortValue = string | number;

/**
 * The RAW underlying value for each column, never the formatted display
 * text (a formatted phone/date/currency string would sort lexicographically
 * wrong - e.g. "10:00" before "9:00"). `status` is whatever the caller
 * already resolved for this lead (see getStatus() in app/leads/page.tsx) -
 * the same effective record filtering already uses, so sorting can never
 * disagree with what's on screen for Main/Secondary Status, Payments or
 * Outcome. A missing payment amount sorts as the lowest possible value in
 * either direction (like "no revenue"), never thrown out or sorted last
 * unconditionally regardless of direction.
 */
export function getLeadSortValue(key: LeadColumnKey, lead: MetaFormLead, status: LeadStatusRecord): LeadSortValue {
  switch (key) {
    case "leadDate":
      return new Date(lead.createdTime).getTime();
    case "name":
      return lead.name ?? "";
    case "phone":
      return lead.normalizedPhone ?? lead.phone ?? "";
    case "mainStatus":
      return status.mainStatus;
    case "secondaryStatus":
      return status.secondaryStatus;
    case "fullPayment":
      return status.fullPaymentAmount ?? -Infinity;
    case "partialPayment":
      return status.partialPaymentAmount ?? -Infinity;
    case "campaign":
      return lead.campaignName || lead.campaignId || "";
    case "adSet":
      return lead.adSetName || lead.adSetId || "";
    case "ad":
      return lead.adName || lead.adId || "";
    case "leadId":
      return lead.sourceType === "landing_page" ? "" : lead.id;
    case "campaignId":
      return lead.campaignId || "";
    case "adSetId":
      return lead.adSetId || "";
    case "adId":
      return lead.adId || "";
    case "outcome":
      return status.secondaryStatus || "";
  }
}

/** Numeric columns compare numerically; everything else compares as Hebrew-aware text. */
export function compareLeadSortValues(a: LeadSortValue, b: LeadSortValue): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "he");
}
