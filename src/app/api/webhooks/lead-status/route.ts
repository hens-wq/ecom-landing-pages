import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { LeadStatusDatabaseError } from "@/lib/lead-status/db";
import { getLeadStatusRepository } from "@/lib/lead-status/repository";
import { checkStatusRequest, resolveStatusUpdate } from "@/lib/lead-status/validation";

// Never statically cached, Node runtime only - consistent with every other
// data route in this app.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * ============================================================================
 * Lead Status Webhook - integration reference
 * ============================================================================
 *
 * Called by Make.com (HTTP > Make a request) or any other system that knows a
 * lead's CRM status. It upserts the one lead_status record per lead, through
 * the SAME business rules the dashboard's own status editor uses
 * (lib/lead-status/validation.ts) - never a second definition of the status
 * hierarchy. The first call for a lead creates its record, so this works
 * "on creation" too.
 *
 * Request
 * -------
 *   POST https://<your-dashboard-domain>/api/webhooks/lead-status
 *   Authorization: Bearer <LEAD_STATUS_WEBHOOK_SECRET>
 *   Content-Type: application/json
 *
 *   {
 *     "leadId": "120210000000001111",   // required - the Meta Lead ID
 *     "mainStatus": "נרשם",               // required
 *     "secondaryStatus": "",              // see below
 *     "fullPaymentAmount": 1500,          // optional - a positive amount only
 *     "partialPaymentAmount": 500         // optional - a positive amount only
 *   }
 *
 * secondaryStatus
 * ---------------
 *   - Main Status "נרשם": may be empty or omitted. The dashboard stores
 *     "נרשם" (enrolled, no payment entered yet) - or, if the lead already has
 *     a Full or Partial payment entered in the dashboard, keeps that payment.
 *   - Every other Main Status: required, and sent exactly as the CRM has it.
 *     Nothing is invented - a missing value is rejected with 400.
 *
 * Payment amounts
 * ---------------
 *   Optional. Omit them and the stored amounts stay as they are - a CRM sync
 *   never erases a payment entered in the dashboard. An entered amount sets
 *   the payment status: a Full amount means "תשלום מלא", a Partial amount
 *   means "תשלום חלקי". Enrollment itself never needs an amount.
 *
 * Valid mainStatus -> secondaryStatus values (must match exactly, including
 * punctuation - see lib/lead-status/types.ts, the single source of truth):
 *
 *   חדש            -> חדש
 *   אין מענה        -> א"מ - יום 1 | א"מ - יום 2 | א"מ - יום 3 |
 *                      א"מ - יום 3 < הפסיק באמצע תהליך
 *   בתהליך          -> בתהליך
 *   לא מעוניין      -> ל"מ - אין שיתוף פעולה | ל"מ - הפסיק באמצע תהליך |
 *                      ל"מ - לו"ז \ מבנה הקורס | ל"מ - לא מעוניין ללמוד הייטק |
 *                      ל"מ - בחר בתואר אקדמי | ל"מ - מתחרים |
 *                      ל"מ - פוטנציאל עתידי | ל"מ - מחיר יקר |
 *                      ל"מ - אין יכולת כלכלית
 *   ליד שגוי        -> ליד שגוי - מכחיש פנייה | ליד שגוי - חשב/ה בחינם |
 *                      ליד שגוי - חשב/ה מדובר בעבודה | ליד שגוי - מס' טלפון שגוי |
 *                      ליד שגוי - מבוגר | ליד שגוי - קטין |
 *                      ליד שגוי - לא ענה מעולם | ליד שגוי - לקוח קיים |
 *                      ליד שגוי - ליד כפול
 *   רשימה שחורה     -> ר"ש - תביעה | ר"ש - מסרב פניות | ר"ש - לקוח בעייתי
 *   ביטול הרשמה     -> ביטל הרשמה - BDI שלילי | ביטל הרשמה - לקוח התחרט
 *   נרשם            -> נרשם | תשלום מלא | תשלום חלקי (see above)
 *   DATA            -> דאטה
 *
 * Responses
 * ---------
 *   200 { "ok": true, "record": { leadId, normalizedPhone, mainStatus,
 *         secondaryStatus, fullPaymentAmount, partialPaymentAmount,
 *         updatedAt } }
 *   400 { "error": { "message": "..." } }  - bad, missing or invalid field
 *   401 { "error": { "message": "אימות נכשל." } }  - wrong or missing token
 *   503 { "error": { "message": "..." } }  - endpoint not configured, or a
 *         database error (never the raw driver error)
 *
 * Safe to retry: the same request twice leaves the same record.
 */

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

type AmountParseResult = { ok: true; value: number | null | undefined } | { ok: false };

function parseOptionalAmount(value: unknown): AmountParseResult {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null) return { ok: true, value: null };
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return { ok: true, value };
  return { ok: false };
}

export async function POST(request: NextRequest) {
  const configuredSecret = process.env.LEAD_STATUS_WEBHOOK_SECRET?.trim();
  if (!configuredSecret) {
    return NextResponse.json(
      { error: { message: "נקודת הקצה אינה מוגדרת (LEAD_STATUS_WEBHOOK_SECRET חסר בצד השרת)." } },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const providedSecret = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  if (!providedSecret || !timingSafeStringEqual(providedSecret, configuredSecret)) {
    return NextResponse.json({ error: { message: "אימות נכשל." } }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: { message: "גוף הבקשה אינו JSON תקין." } }, { status: 400 });
  }

  const leadId = typeof body.leadId === "string" ? body.leadId.trim() : "";
  if (!leadId) {
    return NextResponse.json({ error: { message: "leadId (מזהה ליד פייסבוק) חסר." } }, { status: 400 });
  }

  const fullPaymentParsed = parseOptionalAmount(body.fullPaymentAmount);
  const partialPaymentParsed = parseOptionalAmount(body.partialPaymentAmount);
  if (!fullPaymentParsed.ok || !partialPaymentParsed.ok) {
    return NextResponse.json({ error: { message: "סכום תשלום אינו תקין - יש להזין מספר חיובי." } }, { status: 400 });
  }

  const updateRequest = {
    mainStatus: typeof body.mainStatus === "string" ? body.mainStatus : "",
    secondaryStatus: typeof body.secondaryStatus === "string" ? body.secondaryStatus : "",
    fullPaymentAmount: fullPaymentParsed.value,
    partialPaymentAmount: partialPaymentParsed.value,
  };

  const requestCheck = checkStatusRequest(updateRequest);
  if (!requestCheck.ok) {
    return NextResponse.json({ error: { message: requestCheck.error } }, { status: 400 });
  }

  const repository = getLeadStatusRepository();

  let existing;
  try {
    existing = await repository.get(leadId);
  } catch (error) {
    const message = error instanceof LeadStatusDatabaseError ? error.message : "שגיאה לא צפויה בגישה למסד הנתונים.";
    return NextResponse.json({ error: { message } }, { status: 503 });
  }

  const resolved = resolveStatusUpdate(updateRequest, existing);
  if (!resolved.ok) {
    return NextResponse.json({ error: { message: resolved.error } }, { status: 400 });
  }

  try {
    const updated = await repository.upsert(leadId, {
      mainStatus: resolved.value.mainStatus,
      secondaryStatus: resolved.value.secondaryStatus,
      fullPaymentAmount: resolved.value.fullPaymentAmount,
      partialPaymentAmount: resolved.value.partialPaymentAmount,
    });
    return NextResponse.json({ ok: true, record: updated });
  } catch (error) {
    // Never log the request body - LeadStatusDatabaseError's message is
    // always a safe, hand-written Hebrew string (see db.ts), never the raw
    // driver error.
    const message = error instanceof LeadStatusDatabaseError ? error.message : "שגיאה לא צפויה בשמירת הסטטוס.";
    return NextResponse.json({ error: { message } }, { status: 503 });
  }
}
