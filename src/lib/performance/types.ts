import type { LeadSourceType } from "@/lib/types";

/**
 * One lead as the performance layer sees it: its entry date, its Meta attribution
 * IDs and its current Ecom status. Never carries a name, phone or email, so the
 * dashboard API can use it without exposing personal data.
 */
export interface LeadFact {
  id: string;
  sourceType: LeadSourceType;
  /** Lead entry date, "YYYY-MM-DD" in REPORTING_TIMEZONE. Every report is attributed to this date. */
  leadDate: string;
  campaignId: string | null;
  adSetId: string | null;
  adId: string | null;
  /** False when the status could not be loaded. The lead's sale and quality state is then unknown, not "not a sale". */
  statusKnown: boolean;
  mainStatus: string | null;
  secondaryStatus: string | null;
  fullPaymentAmount: number | null;
  partialPaymentAmount: number | null;
}

export type SourceState = "ok" | "partial" | "unavailable";

export interface LeadFactsResult {
  since: string;
  until: string;
  leads: LeadFact[];
  sources: {
    meta: { state: "ok" | "unavailable"; message: string | null };
    landing: { state: "ok" | "unavailable"; message: string | null };
    statuses: { state: SourceState; unknownCount: number; message: string | null };
  };
}
