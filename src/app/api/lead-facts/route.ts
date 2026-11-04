import { NextResponse, type NextRequest } from "next/server";

import { isValidDateRange } from "@/lib/advertising/date-range";
import { liveLeadFactsSources } from "@/lib/performance/lead-fact-sources";
import { loadLeadFacts } from "@/lib/performance/load-lead-facts";
import { denyWithoutSession } from "@/lib/auth/session";

// Lead facts for one date range: attribution IDs, entry date and current status
// per lead, and no names, phones or emails. Partial failures come back inside the
// payload (see `sources`) with a 200, so a dashboard can show "unknown" instead of
// a misleading zero. Node runtime only, like the other lead routes.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const denied = denyWithoutSession(request);
  if (denied) return denied;

  const since = request.nextUrl.searchParams.get("since") ?? "";
  const until = request.nextUrl.searchParams.get("until") ?? "";

  if (!isValidDateRange({ since, until })) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "פרמטרי טווח תאריכים (since/until) חסרים או לא תקינים." } },
      { status: 400 }
    );
  }

  const result = await loadLeadFacts({ since, until }, liveLeadFactsSources);
  return NextResponse.json(result);
}
