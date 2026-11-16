import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { flushCrmEvents } from "@/lib/crm-capi/service";
import { LeadStatusDatabaseError } from "@/lib/lead-status/db";

// Never statically cached. Node runtime, like the other data routes.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/crm-capi/flush
 *   Authorization: Bearer <CRM_CAPI_FLUSH_SECRET>
 *
 * Retries the CRM events that are due: failed attempts whose wait has passed,
 * and rows a crashed worker left claimed. Does nothing while
 * META_CAPI_CRM_SEND_ENABLED is not "true". The reply carries counts only,
 * never event data, lead IDs or Meta's error text.
 */

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(request: NextRequest) {
  const configuredSecret = process.env.CRM_CAPI_FLUSH_SECRET?.trim();
  if (!configuredSecret) {
    return NextResponse.json(
      { error: { message: "נקודת הקצה אינה מוגדרת (CRM_CAPI_FLUSH_SECRET חסר בצד השרת)." } },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const providedSecret = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  if (!providedSecret || !timingSafeStringEqual(providedSecret, configuredSecret)) {
    return NextResponse.json({ error: { message: "אימות נכשל." } }, { status: 401 });
  }

  try {
    const summary = await flushCrmEvents({ limit: 25, now: new Date(), fetchImpl: fetch });
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    if (error instanceof LeadStatusDatabaseError) {
      return NextResponse.json({ error: { message: error.message } }, { status: 503 });
    }
    return NextResponse.json({ error: { message: "שגיאה לא צפויה בשליחת אירועי CRM." } }, { status: 500 });
  }
}
