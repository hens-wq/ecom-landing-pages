import { NextResponse } from "next/server";

import { AdvertisingApiError, httpStatusForErrorCode } from "@/lib/advertising";
import { checkMetaConfig } from "@/lib/advertising/meta/config";
import { loadScaleAnalysis } from "@/lib/lead-quality/load-scale";
import { readCampaignListing } from "@/lib/optimization/server/collect";
import { liveLeadFactsSources } from "@/lib/performance/lead-fact-sources";
import { loadLeadFacts } from "@/lib/performance/load-lead-facts";
import { demoDataEnabled } from "@/lib/runtime-mode";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

export async function GET() {
  try {
    const demo = checkMetaConfig().status === "unconfigured" && demoDataEnabled();
    const body = await loadScaleAnalysis(new Date(), {
      source: demo ? "mock" : "meta",
      readCampaigns: readCampaignListing,
      readLeadFacts: (range) => loadLeadFacts(range, liveLeadFactsSources),
    });
    return NextResponse.json(body, { headers: PRIVATE_HEADERS });
  } catch (error) {
    if (error instanceof AdvertisingApiError) {
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: httpStatusForErrorCode(error.code), headers: PRIVATE_HEADERS });
    }
    return NextResponse.json({ error: { code: "unknown_error", message: "לא ניתן לטעון את בדיקת הסקייל כרגע. נסו לרענן שוב." } }, { status: 500, headers: PRIVATE_HEADERS });
  }
}
