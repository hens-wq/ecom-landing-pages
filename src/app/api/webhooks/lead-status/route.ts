import { after } from "next/server";

import { flushCrmEventsSafely, recordCrmChangeSafely } from "@/lib/crm-capi/service";
import { loadDashboardLeadIndex } from "@/lib/lead-status/dashboard-leads";
import { pendingStore } from "@/lib/lead-status/pending-store";
import { getLeadStatusRepository } from "@/lib/lead-status/repository";
import { runLeadStatusWebhook } from "@/lib/lead-status/webhook-handler";

// Never statically cached, Node runtime only - consistent with every other
// data route in this app.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * ============================================================================
 * Lead Status Webhook - integration reference
 * ============================================================================
 *
 * Called by Fireberry (automations) and Make.com (HTTP > Make a request).
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
 *     "phone": "052-8678178",             // optional - any Israeli format, or a number
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
 *   explicit null clears it. Empty strings, 0, fractions and unknown codes are rejected (400).
 *   A rating-only update does not require mainStatus/secondaryStatus. Ordinary status updates preserve rating.
 *
 * How the lead is found
 * ---------------------
 *   1. leadId, when it is a lead the dashboard knows (Meta or landing page).
 *   2. Otherwise phone, normalized to the Israeli national form
 *      (052-867-8178, +972528678178, 972528678178, 00972528678178 and 528678178 as a number
 *      all become 0528678178). Names are never used.
 *   A phone that matches more than one lead is not guessed at.
 *
 *   leadId must be sent as a string. A number this large loses digits in JSON.
 *
 * When the lead is not found (or cannot be identified)
 * ----------------------------------------------------
 *   The update is NOT lost and NOT applied. It is stored as a pending update, and the reply is 200 with
 *   "applied": false, so the automation keeps running. Stored pending updates are reviewed and completed with the
 *   admin endpoint GET/POST /api/admin/lead-status/pending (Bearer LEAD_STATUS_ADMIN_SECRET). A replay matches each
 *   pending update again against the leads the dashboard knows, and applies it only if no newer write to that lead
 *   exists. Sending the same update again while it is still pending does not store a second copy.
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
 *   ברח במעמד התשלום -> ברח במעמד התשלום
 *   DATA            -> דאטה
 *
 * Responses
 * ---------
 *   200 { "ok": true, "applied": true, "matchedBy": "lead_id" | "phone", "leadId": "...",
 *         "record": { leadId, normalizedPhone, mainStatus, secondaryStatus,
 *         fullPaymentAmount, partialPaymentAmount, studentRating, updatedAt } }
 *   200 { "ok": true, "applied": false, "recorded": true, "reason": "not_found" | "ambiguous" |
 *         "invalid_phone" | "missing_identity", "pendingId": 12, "duplicate": false }
 *         - kept as a pending update; nothing was changed on the lead.
 *   400 { "error": { "message": "..." } }  - bad, missing or invalid field (the sender must fix the request)
 *   401 { "error": { "message": "אימות נכשל." } }  - wrong or missing token
 *   403 { "error": { "message": "..." } }  - rating-only credential sent status/payment fields
 *   503 { "error": { "message": "...", "retryable": true }, "recorded": true, "pendingId": 12 }
 *         - the Meta lead list could not be read; the update is kept and must be retried or replayed
 *   503 { "error": { "message": "..." } }  - endpoint not configured, or a database error (never the raw driver error)
 *   500 { "error": { "message": "..." } }  - unexpected error
 *
 * Optional field for the CRM (lib/crm-capi): "statusChangedAt" (ISO 8601) is the time the CRM changed
 * the status. Without it the arrival time is used. Meta CRM events are queued after the status is saved
 * and never change this reply. Nothing is queued while META_CAPI_CRM_SEND_ENABLED is not "true".
 *
 * Safe to retry: the same request twice leaves the same record.
 */
export async function POST(request: Request) {
  return runLeadStatusWebhook(request, {
    env: process.env,
    now: () => new Date(),
    loadIndex: loadDashboardLeadIndex,
    store: getLeadStatusRepository(),
    pending: pendingStore,
    recordCrm: recordCrmChangeSafely,
    schedule: (task) => after(task),
    flush: (limit) => flushCrmEventsSafely(limit),
    log: (line) => console.info(line),
  });
}
