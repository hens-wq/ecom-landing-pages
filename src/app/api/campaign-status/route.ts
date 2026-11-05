import { NextResponse } from "next/server";

import { AdvertisingApiError, httpStatusForErrorCode } from "@/lib/advertising";
import { getCampaignStatuses } from "@/lib/campaign-status";
import { denyUnlessPrivateAreaOpen } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const denied = denyUnlessPrivateAreaOpen();
  if (denied) return denied;

  try {
    const statuses = await getCampaignStatuses();
    return NextResponse.json({ statuses });
  } catch (error) {
    if (error instanceof AdvertisingApiError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: httpStatusForErrorCode(error.code) }
      );
    }
    return NextResponse.json(
      { error: { code: "unknown_error", message: "שגיאה לא צפויה בטעינת סטטוסי קמפיינים." } },
      { status: 500 }
    );
  }
}
