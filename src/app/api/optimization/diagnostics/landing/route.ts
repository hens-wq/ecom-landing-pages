import { NextResponse } from "next/server";

import { isValidDateRange } from "@/lib/advertising/date-range";
import type { DateRange } from "@/lib/advertising/types";
import { metaIdOrNull } from "@/lib/landing-leads/validation";
import { runRangeError } from "@/lib/optimization/run";
import { badRequest, optimizationErrorResponse } from "@/lib/optimization/server/http";
import { runLandingDiagnostic } from "@/lib/optimization/server/landing-diagnostics";

// Read-only diagnostic of landing-page lead capture for one range. It changes no lead, writes nothing and never calls Meta
// with a write. The campaign is chosen by its ID only.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {

  const url = new URL(request.url);
  const range: DateRange = {
    since: url.searchParams.get("since") ?? "",
    until: url.searchParams.get("until") ?? "",
  };
  if (!isValidDateRange(range)) {
    return badRequest("פרמטרי טווח תאריכים (since/until) חסרים או לא תקינים.");
  }
  const rangeProblem = runRangeError(range);
  if (rangeProblem) return badRequest(rangeProblem);

  const rawCampaign = url.searchParams.get("campaignId");
  const campaignId = rawCampaign === null || rawCampaign === "" ? null : metaIdOrNull(rawCampaign);
  if (rawCampaign !== null && rawCampaign !== "" && campaignId === null) {
    return badRequest("מזהה הקמפיין אינו תקין.");
  }

  try {
    const result = await runLandingDiagnostic(range, campaignId);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return optimizationErrorResponse(error);
  }
}
