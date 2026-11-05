import "server-only";

import type { DateRange } from "@/lib/advertising/types";
import { isDatabaseConfigured } from "@/lib/landing-leads/db";
import { getLandingLeadsInRange } from "@/lib/landing-leads/repository";
import {
  buildLandingPipeline,
  type LandingDiagnosticResponse,
  type LandingPipelineRow,
} from "@/lib/optimization/landing-pipeline";
import { readCampaignListing } from "@/lib/optimization/server/collect";
import { landingCampaignId } from "@/lib/performance/load-lead-facts";
import { demoDataEnabled } from "@/lib/runtime-mode";
import type { Campaign } from "@/lib/types";

/**
 * Runs the landing-page capture diagnostic for one range. Read-only: one database read of the landing-page leads, one
 * listing read from Meta. Nothing is written, and no lead is changed. A failed read is reported as failed, never as an
 * empty result, so a missing lead can never look like a real zero.
 */
export async function runLandingDiagnostic(range: DateRange, selectedCampaignId: string | null): Promise<LandingDiagnosticResponse> {
  if (!isDatabaseConfigured()) {
    return {
      state: "unavailable",
      message: demoDataEnabled()
        ? "מצב הדגמה: אין חיבור למסד הנתונים האמיתי, לכן האבחון לא רץ על לידים אמיתיים."
        : "מסד הנתונים אינו מוגדר (DATABASE_URL חסר). אי אפשר לאבחן את קליטת הלידים.",
    };
  }

  let dbState: "ok" | "failed" = "ok";
  let rows: LandingPipelineRow[] = [];
  try {
    const records = await getLandingLeadsInRange(range.since, range.until);
    rows = records.map((record) => ({
      internalLeadId: record.internalLeadId,
      submittedAt: record.submittedAt,
      campaignId: landingCampaignId(record),
      adSetId: record.adSetId,
      adId: record.adId,
    }));
  } catch {
    // The error text is not shown: it can carry connection details. The report says only that the read failed.
    dbState = "failed";
  }

  let campaigns: Campaign[] | null = null;
  try {
    campaigns = (await readCampaignListing(range)).campaigns;
  } catch {
    campaigns = null;
  }

  return {
    state: "report",
    report: buildLandingPipeline({ range, dbState, rows, campaigns, selectedCampaignId }),
  };
}
