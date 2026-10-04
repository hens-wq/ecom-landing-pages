import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { LeadStatusDatabaseError } from "@/lib/lead-status/db";
import { getLeadStatusRepository } from "@/lib/lead-status/repository";
import { isMainStatus, SECONDARY_STATUSES_BY_MAIN } from "@/lib/lead-status/types";
import { validateStatusUpdate } from "@/lib/lead-status/validation";

// Never statically cached, Node runtime only - consistent with every other
// data route in this app.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * ============================================================================
 * Lead Status Webhook - integration reference
 * ============================================================================
 *
 * Call this from a Make.com "HTTP > Make a request" module, or directly from
 * any other system (CRM, landing page backend, etc.) that knows a lead's
 * Main/Secondary status. It upserts lib/lead-status's one record per lead -
 * the SAME table, and the SAME validateStatusUpdate() business rules, the
 * dashboard's own UI writes through - never a second definition of the
 * status hierarchy. upsert() means this also works the very first time a
 * lead's status is set ("update on creation"): no row has to exist yet.
 *
 * Request
 * -------
 *   POST https://<your-dashboard-domain>/api/webhooks/lead-status
 *   Authorization: Bearer <LEAD_STATUS_WEBHOOK_SECRET>
 *   Content-Type: application/json
 *
 *   {
 *     "leadId": "120210000000001111",   // required - see "leadId" below
 *     "mainStatus": "בתהליך",             // required - one of MAIN_STATUSES
 *     "secondaryStatus": "בתהליך",        // optional - see below
 *     "fullPaymentAmount": 1500,          // optional, only for "תשלום מלא"
 *     "partialPaymentAmount": 500         // optional, only for "תשלום חלקי"
 *   }
 *
 * - "leadId": the Meta Lead ID for a lead captured via a Meta Instant Form.
 *   (A landing-page lead that has no Meta Lead ID instead uses its internal
 *   lead UUID as this same key internally - irrelevant for a typical Meta
 *   Lead Ads flow, worth knowing only if this is ever called for a
 *   landing-page-sourced lead.)
 * - "secondaryStatus" is OPTIONAL: when omitted (or sent as an empty
 *   string), it defaults to the first secondary status under the given main
 *   status - the exact same default the dashboard's own Main Status dropdown
 *   applies. Pass it explicitly whenever the caller actually knows the
 *   specific reason/sub-stage; omit it when the caller only tracks a coarse
 *   main-status pipeline stage.
 * - Payment amounts are REQUIRED (must be a positive number) only when
 *   secondaryStatus is "תשלום מלא" or "תשלום חלקי" under mainStatus "נרשם" -
 *   the request is rejected with 400 otherwise. Omit both fields entirely
 *   for every other status.
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
 *   נרשם            -> תשלום מלא | תשלום חלקי
 *   DATA            -> דאטה
 *
 * Responses
 * ---------
 *   200 { "ok": true, "record": { leadId, normalizedPhone, mainStatus,
 *         secondaryStatus, fullPaymentAmount, partialPaymentAmount,
 *         updatedAt } }
 *   400 { "error": { "message": "..." } }  - bad/missing/invalid field
 *   401 { "error": { "message": "אימות נכשל." } }  - wrong/missing bearer token
 *   503 { "error": { "message": "..." } }  - endpoint not configured, or a
 *         database error (never the raw driver error)
 *
 * Safe to call repeatedly with the same values (idempotent upsert) - a retry
 * from Make after a timeout never double-applies anything.
 */
function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

interface WebhookBody {
  leadId?: unknown;
  mainStatus?: unknown;
  secondaryStatus?: unknown;
  fullPaymentAmount?: unknown;
  partialPaymentAmount?: unknown;
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

  let body: WebhookBody;
  try {
    body = (await request.json()) as WebhookBody;
  } catch {
    return NextResponse.json({ error: { message: "גוף הבקשה אינו JSON תקין." } }, { status: 400 });
  }

  const leadId = typeof body.leadId === "string" ? body.leadId.trim() : "";
  if (!leadId) {
    return NextResponse.json({ error: { message: "leadId (מזהה ליד פייסבוק) חסר." } }, { status: 400 });
  }

  const mainStatus = typeof body.mainStatus === "string" ? body.mainStatus.trim() : "";
  if (!mainStatus) {
    return NextResponse.json({ error: { message: "mainStatus חסר." } }, { status: 400 });
  }
  if (!isMainStatus(mainStatus)) {
    return NextResponse.json({ error: { message: `סטטוס ראשי לא תקין: "${mainStatus}".` } }, { status: 400 });
  }

  // secondaryStatus is optional - callers that only track a coarse main-
  // status stage (no specific reason code) can omit it entirely; this then
  // defaults to the same first option the dashboard's own Main Status
  // dropdown applies for that main status.
  const rawSecondary = typeof body.secondaryStatus === "string" ? body.secondaryStatus.trim() : "";
  const secondaryStatus = rawSecondary || SECONDARY_STATUSES_BY_MAIN[mainStatus][0];

  const fullPaymentParsed = parseOptionalAmount(body.fullPaymentAmount);
  const partialPaymentParsed = parseOptionalAmount(body.partialPaymentAmount);
  if (!fullPaymentParsed.ok || !partialPaymentParsed.ok) {
    return NextResponse.json({ error: { message: "סכום תשלום אינו תקין - יש להזין מספר חיובי." } }, { status: 400 });
  }
  const fullPaymentAmount = fullPaymentParsed.value;
  const partialPaymentAmount = partialPaymentParsed.value;

  const repository = getLeadStatusRepository();

  let existing;
  try {
    existing = await repository.get(leadId);
  } catch (error) {
    const message = error instanceof LeadStatusDatabaseError ? error.message : "שגיאה לא צפויה בגישה למסד הנתונים.";
    return NextResponse.json({ error: { message } }, { status: 503 });
  }

  const validation = validateStatusUpdate({ mainStatus, secondaryStatus, fullPaymentAmount, partialPaymentAmount }, existing);
  if (!validation.ok) {
    return NextResponse.json({ error: { message: validation.error } }, { status: 400 });
  }

  try {
    const updated = await repository.upsert(leadId, {
      mainStatus,
      secondaryStatus,
      fullPaymentAmount,
      partialPaymentAmount,
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
