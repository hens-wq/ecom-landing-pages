import { NextResponse, type NextRequest } from "next/server";

import { isValidDateRange } from "@/lib/advertising/date-range";
import { AdvertisingApiError, getAdvertisingData, httpStatusForErrorCode } from "@/lib/advertising";

// Always dynamic: this reads query params and hits a live API (or mock data
// that depends on the requested range) on every call - it must never be
// statically cached/pre-rendered by Next.js.
export const dynamic = "force-dynamic";
// Runs on the Node.js runtime (not Edge), same guarantee as `server-only`
// imports throughout lib/advertising: the Meta access token never has to be
// anywhere the Edge runtime's request path could expose it.
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
    const result = await getAdvertisingData({ since, until });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdvertisingApiError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: httpStatusForErrorCode(error.code) }
      );
    }
    return NextResponse.json(
      { error: { code: "unknown_error", message: "שגיאה לא צפויה בטעינת נתוני הפרסום." } },
      { status: 500 }
    );
  }
}
