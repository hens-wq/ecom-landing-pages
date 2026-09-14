import { NextResponse, type NextRequest } from "next/server";

import { AdvertisingApiError, httpStatusForErrorCode } from "@/lib/advertising";
import { isValidDateRange } from "@/lib/advertising/date-range";
import { getLeadsData } from "@/lib/leads";

// Same guarantees as /api/advertising: never statically cached, Node runtime
// only (never Edge) so the Meta access token's request path never touches
// anything but a server process.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const since = request.nextUrl.searchParams.get("since") ?? "";
  const until = request.nextUrl.searchParams.get("until") ?? "";

  if (!isValidDateRange({ since, until })) {
    return NextResponse.json(
      { error: { code: "bad_request", message: "פרמטרי טווח תאריכים (since/until) חסרים או לא תקינים." } },
      { status: 400 }
    );
  }

  try {
    const result = await getLeadsData({ since, until });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdvertisingApiError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: httpStatusForErrorCode(error.code) }
      );
    }
    // Never include `error` itself in the response - it may wrap a raw fetch
    // failure whose message could echo request details. A generic message is
    // enough for the client; the code path (code/detail) that hit this is
    // still visible server-side via the thrown error's stack.
    return NextResponse.json(
      { error: { code: "unknown_error", message: "שגיאה לא צפויה בטעינת הלידים." } },
      { status: 500 }
    );
  }
}
