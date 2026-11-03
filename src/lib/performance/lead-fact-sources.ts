import "server-only";

import { AdvertisingApiError, type DateRange } from "@/lib/advertising/types";
import { LandingLeadsDatabaseError } from "@/lib/landing-leads/db";
import { getLandingLeadsInRange } from "@/lib/landing-leads/repository";
import { LeadStatusDatabaseError } from "@/lib/lead-status/db";
import { getLeadStatusRepository } from "@/lib/lead-status/repository";
import { getLeadsData } from "@/lib/leads";
import { LeadSourceError, type LeadFactsSources } from "@/lib/performance/load-lead-facts";

/** The real sources behind /api/lead-facts. Each one turns its own failures into a LeadSourceError with a user-safe message. */
export const liveLeadFactsSources: LeadFactsSources = {
  async readMetaLeads(range: DateRange) {
    try {
      const result = await getLeadsData(range);
      // Without a Meta connection getLeadsData returns demo leads. They must never be joined with real landing leads and
      // statuses, so the lead figures are reported as unavailable instead of being shown as real.
      if (result.source !== "meta") {
        throw new LeadSourceError("החשבון לא מחובר ל-Meta Ads (מצב דמו).");
      }
      return result.leads;
    } catch (error) {
      if (error instanceof LeadSourceError) throw error;
      throw new LeadSourceError(error instanceof AdvertisingApiError ? error.message : "לא ניתן לטעון לידים מ-Meta כרגע.");
    }
  },

  async readLandingLeads(range: DateRange) {
    try {
      return await getLandingLeadsInRange(range.since, range.until);
    } catch (error) {
      throw new LeadSourceError(
        error instanceof LandingLeadsDatabaseError ? error.message : "לא ניתן לטעון לידים מדפי הנחיתה כרגע."
      );
    }
  },

  async readStatuses(leadIds: string[]) {
    try {
      return await getLeadStatusRepository().getMany(leadIds);
    } catch (error) {
      throw new LeadSourceError(
        error instanceof LeadStatusDatabaseError ? error.message : "לא ניתן לטעון סטטוסי לידים ממסד הנתונים כרגע."
      );
    }
  },
};
