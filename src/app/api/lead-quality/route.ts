import { NextResponse, type NextRequest } from "next/server";

import { AdvertisingApiError, httpStatusForErrorCode } from "@/lib/advertising";
import { checkMetaConfig } from "@/lib/advertising/meta/config";
import { createCampaignScope } from "@/lib/campaign-scope";
import { buildLeadQualityReport } from "@/lib/lead-quality";
import type { LeadQualityApiResponse } from "@/lib/lead-quality/types";
import { parseLeadQualityRequest } from "@/lib/lead-quality-request";
import { readCampaignListing } from "@/lib/optimization/server/collect";
import { liveLeadFactsSources } from "@/lib/performance/lead-fact-sources";
import { loadLeadFacts } from "@/lib/performance/load-lead-facts";
import type { LeadFactsResult } from "@/lib/performance/types";
import { demoDataEnabled } from "@/lib/runtime-mode";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest) {
  const selected = parseLeadQualityRequest(request.nextUrl.searchParams);
  if (!selected) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "יש לבחור תאריכים תקינים וסטטוס קמפיין: פעילים, כבויים או הכול." } },
      { status: 400, headers: PRIVATE_HEADERS },
    );
  }

  try {
    const demo = checkMetaConfig().status === "unconfigured" && demoDataEnabled();
    // In demo mode never join a fabricated advertising hierarchy to real CRM or landing-page data.
    const leadRequest: Promise<LeadFactsResult | null> = demo
      ? Promise.resolve(null)
      : loadLeadFacts(selected.range, liveLeadFactsSources);
    // Only the selected period is loaded. No optimization run, comparison windows, or saved report is created.
    const [snapshot, facts] = await Promise.all([readCampaignListing(selected.range), leadRequest]);
    const courseScope = createCampaignScope(snapshot.excludedCampaigns);
    const leadsKnown = facts !== null && facts.sources.meta.state === "ok" && facts.sources.landing.state === "ok";
    const notices = demo
      ? ["מצב הדגמה: נתוני הפרסום סינתטיים. לידים וסטטוסים אמיתיים אינם מחוברים לתצוגה זו."]
      : [facts?.sources.meta.message, facts?.sources.landing.message, facts?.sources.statuses.message].filter(
          (message): message is string => Boolean(message),
        );
    if (facts && !leadsKnown) {
      notices.push("חלק ממקורות הלידים לא נטענו. הכמויות הן של הלידים שנטענו בלבד; אחוזים ועלויות לליד אינם זמינים.");
    }
    const body: LeadQualityApiResponse = {
      report: buildLeadQualityReport({
        campaigns: snapshot.campaigns,
        leads: (facts?.leads ?? []).filter((lead) => !courseScope.isExcluded(lead.campaignId)),
        range: selected.range,
        statusFilter: selected.campaignStatus,
        leadsKnown,
        unlisted: snapshot.unlisted,
      }),
      metadata: {
        source: demo ? "mock" : "meta",
        generatedAt: new Date().toISOString(),
        notices,
        ...(facts ? { sources: facts.sources } : {}),
      },
    };
    return NextResponse.json(body, { headers: PRIVATE_HEADERS });
  } catch (error) {
    if (error instanceof AdvertisingApiError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: httpStatusForErrorCode(error.code), headers: PRIVATE_HEADERS },
      );
    }
    return NextResponse.json(
      { error: { code: "unknown_error", message: "לא ניתן לטעון את ניתוח הקמפיינים כרגע. נסו לרענן שוב." } },
      { status: 500, headers: PRIVATE_HEADERS },
    );
  }
}
