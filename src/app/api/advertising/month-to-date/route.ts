import { NextResponse } from "next/server";

import { AdvertisingApiError, getAccountSpendForRange, httpStatusForErrorCode } from "@/lib/advertising";
import { isoDateInTimezone } from "@/lib/advertising/timezone";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Ad spend from the 1st of the current calendar month through today
 * (Asia/Jerusalem). Deliberately independent of whatever date range the Leads
 * page is showing, so the KPI never moves when that range changes.
 */
export async function GET() {
  const today = isoDateInTimezone(new Date());
  const range = { since: `${today.slice(0, 8)}01`, until: today };

  try {
    const result = await getAccountSpendForRange(range);
    return NextResponse.json({ ...result, since: range.since, until: range.until });
  } catch (error) {
    if (error instanceof AdvertisingApiError) {
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: httpStatusForErrorCode(error.code) });
    }
    return NextResponse.json({ error: { code: "unknown_error", message: "שגיאה לא צפויה בטעינת ההוצאה החודשית." } }, { status: 500 });
  }
}
