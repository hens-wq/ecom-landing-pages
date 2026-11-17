import { after, NextResponse, type NextRequest } from "next/server";

import { LandingLeadsDatabaseError } from "@/lib/landing-leads/db";
import { LeadStatusDatabaseError } from "@/lib/lead-status/db";
import { loadDashboardLeadIndex } from "@/lib/lead-status/dashboard-leads";
import { checkCrmSyncRequest, syncCrmStatus } from "@/lib/lead-status/crm-sync";
import { getLeadStatusRepository } from "@/lib/lead-status/repository";
import { parseStudentRatingUpdate } from "@/lib/lead-status/student-rating";
import { authorizeLeadStatusWebhook, hasLeadStatusWebhookSecret, isRatingOnlyWebhookPayload } from "@/lib/lead-status/webhook-auth";
import { formatLeadWebhookDiagnostic, type LeadWebhookDiagnostic, type LeadWebhookHttpStatus, type LeadWebhookReason } from "@/lib/lead-status/webhook-diagnostic";
import { flushCrmEventsSafely, recordCrmChangeSafely } from "@/lib/crm-capi/service";

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
 * lead's CRM status.
 *
 * Request
 * -------
 *   POST https://<your-dashboard-domain>/api/webhooks/lead-status
 *   Authorization: Bearer <LEAD_STATUS_WEBHOOK_SECRET>
 *   Content-Type: application/json
 *   A separate LEAD_RATING_WEBHOOK_SECRET can authorize rating-only requests.
 *   That restricted credential rejects any status or payment fields with 403.
 *
 *   {
 *     "leadId": "120210000000001111",     // optional - the Meta Lead ID, as a STRING
 *     "phone": "052-8678178",             // optional - any Israeli format
 *     "mainStatus": "נרשם",
 *     "secondaryStatus": "",              // see below
 *     "fullPaymentAmount": 1500,          // optional - a positive amount only
 *     "partialPaymentAmount": 500,        // optional - a positive amount only
 *     "pcfsystemfield350": 9              // optional Fireberry raw Picklist code: 9 = four flames
 *   }
 *
 * Send at least one of leadId or phone. Do not send a Fireberry contact ID as leadId.
 *
 * Rating-only example (leaves status and all payment fields untouched atomically):
 *   { "leadId": "known-dashboard-lead-id", "pcfsystemfield350": 9 }
 *
 * Student rating
 * --------------
 *   Fireberry raw pcfsystemfield350: 6->1, 7->2, 8->3, 9->4, 10->5 flames.
 *   Alternatively send canonical studentRating: 1..5. If both are sent they must agree.
 *   Numbers or exact digit strings are supported. Omitted preserves the stored rating;
 *   explicit null clears it. Empty strings, 0, fractions and unknown codes are rejected.
 *   A rating-only update does not require mainStatus/secondaryStatus. A first status row
 *   keeps the dashboard's existing implicit default of חדש/חדש; existing status/payment
 *   fields are never replaced by those defaults. Ordinary status updates preserve rating.
 *   No default 2 is invented. One flame remains valid legacy data, 2/3 are ordinary, 4/5 excellent.
 *   Source event ordering is not available: updatedAt is receipt time, not Fireberry's edit time.
 *
 * How the lead is found
 * ---------------------
 *   1. leadId, when it is a lead the dashboard knows (Meta or landing page).
 *   2. Otherwise phone, normalized to the Israeli national form
 *      (052-867-8178, +972528678178 and 972528678178 all become 0528678178).
 *      Names are never used.
 *   If the phone matches more than one lead, nothing is updated and the reply
 *   is 409. If nothing matches, nothing is updated and the reply is 404. A
 *   lead is only ever updated under its own dashboard ID, so one person keeps
 *   one status row.
 *
 *   leadId must be sent as a string. A number this large loses digits in JSON
 *   and would not match the dashboard's lead.
 *
 * secondaryStatus
 * ---------------
 *   - Main Status "נרשם": may be empty or omitted. The dashboard stores
 *     "נרשם" (enrolled, no payment entered yet), or keeps an existing Full or
 *     Partial payment.
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
 *   200 { "ok": true, "matchedBy": "lead_id" | "phone", "leadId": "...",
 *         "record": { leadId, normalizedPhone, mainStatus, secondaryStatus,
 *         fullPaymentAmount, partialPaymentAmount, studentRating, updatedAt } }
 *   400 { "error": { "message": "..." } }  - bad, missing or invalid field
 *   401 { "error": { "message": "אימות נכשל." } }  - wrong or missing token
 *   403 { "error": { "message": "..." } }  - rating-only credential sent status/payment fields
 *   404 { "error": { "message": "..." } }  - no lead matches; nothing updated
 *   409 { "error": { "message": "..." } }  - phone matches several leads; nothing updated
 *   503 { "error": { "message": "..." } }  - endpoint not configured, or a
 *         database error (never the raw driver error)
 *
 * Optional field for the CRM (lib/crm-capi): "statusChangedAt" (ISO 8601) is the time the CRM changed
 * the status. Without it the arrival time is used. Meta CRM events are queued after the status is saved
 * and never change this reply. Nothing is queued while META_CAPI_CRM_SEND_ENABLED is not "true".
 *
 * Safe to retry: the same request twice leaves the same record.
 */

/** The CRM's own time for the status change. An unreadable value is ignored, never refused, so it cannot block the status update. */
function parseStatusChangedAt(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = new Date(value.trim());
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

type AmountParseResult = { ok: true; value: number | null | undefined } | { ok: false };

function parseOptionalAmount(value: unknown): AmountParseResult {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null) return { ok: true, value: null };
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return { ok: true, value };
  return { ok: false };
}

function webhookResponse<T>(
  body: T,
  status: LeadWebhookHttpStatus,
  reason: LeadWebhookReason,
  details: Pick<LeadWebhookDiagnostic, "operation" | "matchedBy" | "metaAvailable" | "leadIdProvided" | "phoneProvided"> = {}
) {
  // One event for each outcome, with no request/response payload or personal data.
  console.info(
    formatLeadWebhookDiagnostic({
      status,
      reason,
      operation: details.operation,
      matchedBy: details.matchedBy,
      metaAvailable: details.metaAvailable,
      leadIdProvided: details.leadIdProvided,
      phoneProvided: details.phoneProvided,
    })
  );
  return NextResponse.json(body, { status });
}

export async function POST(request: NextRequest) {
  const secrets = {
    statusSecret: process.env.LEAD_STATUS_WEBHOOK_SECRET,
    ratingSecret: process.env.LEAD_RATING_WEBHOOK_SECRET,
  };
  if (!hasLeadStatusWebhookSecret(secrets)) {
    return webhookResponse(
      { error: { message: "נקודת הקצה אינה מוגדרת (מפתח webhook חסר בצד השרת)." } },
      503, "not_configured"
    );
  }

  const scope = authorizeLeadStatusWebhook(request.headers.get("authorization"), secrets);
  if (!scope) {
    return webhookResponse({ error: { message: "אימות נכשל." } }, 401, "unauthorized");
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) throw new TypeError("Expected JSON object");
    body = parsed as Record<string, unknown>;
  } catch {
    return webhookResponse({ error: { message: "גוף הבקשה אינו JSON תקין." } }, 400, "invalid_json");
  }

  if (scope === "rating" && !isRatingOnlyWebhookPayload(body)) {
    return webhookResponse({ error: { message: "מפתח זה מורשה לעדכון דירוג בלבד, ללא שדות סטטוס או תשלום." } }, 403, "rating_scope_violation", { operation: "rating" });
  }

  // A numeric leadId has already lost digits in JSON; only a string is trusted.
  const leadId = typeof body.leadId === "string" && body.leadId.trim() ? body.leadId.trim() : null;
  const phone =
    (typeof body.phone === "string" && body.phone.trim()) || (typeof body.phone === "number" && Number.isFinite(body.phone))
      ? (body.phone as string | number)
      : null;
  if (!leadId && phone === null) {
    return webhookResponse({ error: { message: "נדרש leadId (כמחרוזת) או phone לזיהוי הליד." } }, 400, "missing_identity");
  }

  if ((body.mainStatus !== undefined && typeof body.mainStatus !== "string") || (body.secondaryStatus !== undefined && typeof body.secondaryStatus !== "string")) {
    return webhookResponse({ error: { message: "סטטוס ראשי ומשני חייבים להיות טקסט כאשר הם נשלחים." } }, 400, "invalid_status_type");
  }
  const rating = parseStudentRatingUpdate(body);
  if (!rating.ok) return webhookResponse({ error: { message: rating.error } }, 400, "invalid_rating");

  const fullPaymentParsed = parseOptionalAmount(body.fullPaymentAmount);
  const partialPaymentParsed = parseOptionalAmount(body.partialPaymentAmount);
  if (!fullPaymentParsed.ok || !partialPaymentParsed.ok) {
    return webhookResponse({ error: { message: "סכום תשלום אינו תקין - יש להזין מספר חיובי." } }, 400, "invalid_amount");
  }

  const syncInput = {
    leadId,
    phone,
    mainStatus: typeof body.mainStatus === "string" ? body.mainStatus : undefined,
    secondaryStatus: typeof body.secondaryStatus === "string" ? body.secondaryStatus : undefined,
    fullPaymentAmount: fullPaymentParsed.value,
    partialPaymentAmount: partialPaymentParsed.value,
    studentRating: rating.value,
  };

  const requestCheck = checkCrmSyncRequest(syncInput);
  if (!requestCheck.ok) {
    return webhookResponse({ error: { message: requestCheck.error } }, 400, "invalid_request");
  }

  const operation = requestCheck.statusRequest === null ? "rating" : "status";
  try {
    const index = await loadDashboardLeadIndex();
    const result = await syncCrmStatus(syncInput, index, getLeadStatusRepository());

    if (!result.ok) {
      // A not_found records its lookup context as booleans only: was the Meta lead list readable, and which identifiers came with the request.
      const lookup = result.code === "not_found" ? { metaAvailable: index.metaAvailable, leadIdProvided: leadId !== null, phoneProvided: phone !== null } : {};
      return webhookResponse({ error: { message: result.message } }, result.status, result.code, { operation, ...lookup });
    }
    // Meta CRM events: queued after the status is saved (a failure is logged by name and never reaches this
    // reply), and sent after the reply. Nothing here can change the status or the reply.
    await recordCrmChangeSafely({
      leadKey: result.leadId,
      previous: result.previous,
      next: result.record,
      statusChangedAt: parseStatusChangedAt(body.statusChangedAt),
      leadCreatedDate: index.byId.get(result.leadId)?.createdDate,
      now: new Date(),
    });
    after(() => flushCrmEventsSafely(10));

    return webhookResponse({ ok: true, matchedBy: result.matchedBy, leadId: result.leadId, record: result.record }, 200, "success", { operation, matchedBy: result.matchedBy });
  } catch (error) {
    // Never log the request body - it carries phone numbers and payment
    // amounts. The database errors' own messages are always safe, hand-written
    // Hebrew strings (see db.ts), never the raw driver error.
    if (error instanceof LeadStatusDatabaseError || error instanceof LandingLeadsDatabaseError) {
      return webhookResponse({ error: { message: error.message } }, 503, "database_error", { operation });
    }
    return webhookResponse({ error: { message: "שגיאה לא צפויה בעדכון הסטטוס מה-CRM." } }, 500, "unexpected_error", { operation });
  }
}
