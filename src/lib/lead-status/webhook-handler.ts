/**
 * POST /api/webhooks/lead-status: request handling for the Fireberry and Make status sync. Pure: the
 * environment, the lead index, the stores and the CRM recorder are passed in, so each reply is tested without
 * a database or Meta. The route file (src/app/api/webhooks/lead-status/route.ts) wires the real ones.
 *
 * Replies, in short:
 *   - Contract and credential errors keep their codes (400, 401, 403, 503 not configured).
 *   - A lead that cannot be identified (not_found, ambiguous, invalid_phone, missing_identity) is stored as a
 *     pending update and answered 200 with applied: false. An automation that gets 200 keeps running; the stored
 *     update is completed later by the admin replay (POST /api/admin/lead-status/pending).
 *   - When the Meta lead list cannot be read the update is still stored in the durable queue, and the reply is 200
 *     with applied: false, reason meta_unavailable and retryLater: true. A later webhook reply retries it. A failed save is a 503.
 *   - A database failure is 503 and an unexpected one is 500. Real failures are never answered 200.
 */
import { randomUUID } from "node:crypto";

import { parseStudentRatingUpdate } from "@/lib/lead-status/student-rating";
import { authorizeLeadStatusWebhook, hasLeadStatusWebhookSecret, isRatingOnlyWebhookPayload } from "@/lib/lead-status/webhook-auth";
import { formatLeadWebhookDiagnostic, type LeadWebhookReason } from "@/lib/lead-status/webhook-diagnostic";
import { checkCrmSyncRequest, syncCrmStatus, type CrmStatusStore, type CrmSyncInput, type DashboardLeadIndex } from "@/lib/lead-status/crm-sync";
import {
  RUN_LEASE_SECONDS,
  pendingDedupeKey,
  type CrmChangeRecorder,
  type PendingKind,
  type PendingPayload,
  type PendingReason,
  type PendingStore,
} from "@/lib/lead-status/pending-core";
import { replayPendingRows } from "@/lib/lead-status/pending-replay";
import { normalizeIsraeliPhone } from "@/lib/phone";

export interface LeadStatusWebhookDeps {
  env: Record<string, string | undefined>;
  now: () => Date;
  loadIndex: () => Promise<DashboardLeadIndex>;
  store: CrmStatusStore;
  pending: PendingStore;
  recordCrm: CrmChangeRecorder;
  /** Runs after the reply is sent (the route passes Next's after()). */
  schedule: (task: () => Promise<void>) => void;
  flush: (limit: number) => Promise<void>;
  /** Receives one diagnostic line per outcome. The line never holds the request body or personal data. */
  log: (line: string) => void;
}

type Operation = "status" | "rating";

/** The reasons this webhook can store. "imported" comes only from the admin import, never from a live request. */
type WebhookPendingReason = Exclude<PendingReason, "imported">;

/** The CRM's own time for the status change. An unreadable value is ignored, never refused, so it cannot block the update. */
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

function isDatabaseError(error: unknown): error is Error {
  return error instanceof Error && (error.name === "LeadStatusDatabaseError" || error.name === "LandingLeadsDatabaseError");
}

function reply(
  deps: LeadStatusWebhookDeps,
  body: unknown,
  status: 200 | 400 | 401 | 403 | 404 | 409 | 500 | 503,
  reason: LeadWebhookReason,
  details: {
    operation?: Operation;
    matchedBy?: "lead_id" | "phone";
    metaAvailable?: boolean;
    leadIdProvided?: boolean;
    phoneProvided?: boolean;
    recorded?: boolean;
  } = {}
): Response {
  deps.log(formatLeadWebhookDiagnostic({ status, reason, ...details }));
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

/** Everything the webhook would have applied, as a pending update. Absent keys stay absent. */
function payloadFor(input: CrmSyncInput, statusChangedAt: Date | undefined): PendingPayload {
  const payload: PendingPayload = {};
  if (input.mainStatus !== undefined) payload.mainStatus = input.mainStatus;
  if (input.secondaryStatus !== undefined) payload.secondaryStatus = input.secondaryStatus;
  if (input.fullPaymentAmount !== undefined) payload.fullPaymentAmount = input.fullPaymentAmount;
  if (input.partialPaymentAmount !== undefined) payload.partialPaymentAmount = input.partialPaymentAmount;
  if (input.studentRating !== undefined) payload.studentRating = input.studentRating;
  if (statusChangedAt) payload.statusChangedAt = statusChangedAt.toISOString();
  return payload;
}

interface UnidentifiedUpdate {
  input: CrmSyncInput;
  leadId: string | null;
  phone: string | number | null;
  statusChangedAt: Date | undefined;
  operation: Operation;
  reason: WebhookPendingReason;
  metaAvailable?: boolean;
}

/** Stores the update and answers for it. A repeat of an update that is still open is counted, not stored again. */
async function keepUnidentified(deps: LeadStatusWebhookDeps, update: UnidentifiedUpdate): Promise<Response> {
  const kind: PendingKind = update.operation === "status" ? "status" : "rating";
  const normalizedPhone = update.phone === null ? null : normalizeIsraeliPhone(String(update.phone)) || null;
  const payload = payloadFor(update.input, update.statusChangedAt);
  const stored = await deps.pending.insert({
    dedupeKey: pendingDedupeKey({ leadIdHint: update.leadId, normalizedPhone, kind, payload }),
    reason: update.reason,
    kind,
    leadIdHint: update.leadId,
    normalizedPhone,
    payload,
    sourceAt: deps.now(),
  });
  const details = {
    operation: update.operation,
    metaAvailable: update.metaAvailable,
    leadIdProvided: update.leadId !== null,
    phoneProvided: update.phone !== null,
    recorded: true,
  };
  const recorded = { recorded: true, reason: update.reason, pendingId: stored.id, duplicate: !stored.inserted };
  // Kept in the durable queue, so the sender gets a success and keeps running; a later webhook reply finishes the update.
  // A failed save never reaches this line: the insert throws, and the catch answers 503.
  const retryLater = update.reason === "meta_unavailable" ? { retryLater: true } : {};
  return reply(deps, { ok: true, applied: false, ...recorded, ...retryLater }, 200, update.reason, details);
}

/** How many open updates one webhook call retries. A row is retried again only after the retry interval (10 minutes). */
const RETRY_BATCH = 25;

/**
 * Retries the due pending updates in the background after a webhook reply, using the lead index this request
 * already loaded. It applies only what the same rules allow, and it never throws: a failure is logged by name only.
 * This is what completes a rating that arrives before its lead does, once the lead is in the dashboard.
 */
async function retryOpenUpdates(deps: LeadStatusWebhookDeps, index: DashboardLeadIndex): Promise<void> {
  const holder = randomUUID();
  let locked = false;
  try {
    if (!index.metaAvailable) return;
    // One completion run at a time. When another run holds the lock, that run takes these rows.
    locked = await deps.pending.tryAcquireRun(holder, RUN_LEASE_SECONDS);
    if (!locked) return;
    const rows = await deps.pending.listRetryable(RETRY_BATCH);
    if (rows.length === 0) return;
    const report = await replayPendingRows(rows, {
      index,
      store: deps.store,
      pending: deps.pending,
      recordCrm: deps.recordCrm,
      now: deps.now(),
      dryRun: false,
    });
    if (report.counts.applied > 0) await deps.flush(20);
    deps.log(JSON.stringify({ event: "lead_status_pending_retry", checked: report.checked, applied: report.counts.applied, superseded: report.counts.superseded }));
  } catch (error) {
    deps.log(JSON.stringify({ event: "lead_status_pending_retry", error: error instanceof Error ? error.name : "unknown" }));
  } finally {
    if (locked) await deps.pending.releaseRun(holder).catch(() => undefined);
  }
}

export async function runLeadStatusWebhook(request: Request, deps: LeadStatusWebhookDeps): Promise<Response> {
  const secrets = {
    statusSecret: deps.env.LEAD_STATUS_WEBHOOK_SECRET,
    ratingSecret: deps.env.LEAD_RATING_WEBHOOK_SECRET,
  };
  if (!hasLeadStatusWebhookSecret(secrets)) {
    return reply(deps, { error: { message: "נקודת הקצה אינה מוגדרת (מפתח webhook חסר בצד השרת)." } }, 503, "not_configured");
  }

  const scope = authorizeLeadStatusWebhook(request.headers.get("authorization"), secrets);
  if (!scope) return reply(deps, { error: { message: "אימות נכשל." } }, 401, "unauthorized");

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) throw new TypeError("Expected JSON object");
    body = parsed as Record<string, unknown>;
  } catch {
    return reply(deps, { error: { message: "גוף הבקשה אינו JSON תקין." } }, 400, "invalid_json");
  }

  if (scope === "rating" && !isRatingOnlyWebhookPayload(body)) {
    return reply(
      deps,
      { error: { message: "מפתח זה מורשה לעדכון דירוג בלבד, ללא שדות סטטוס או תשלום." } },
      403,
      "rating_scope_violation",
      { operation: "rating" }
    );
  }

  // A numeric leadId has already lost digits in JSON; only a string is trusted.
  const leadId = typeof body.leadId === "string" && body.leadId.trim() ? body.leadId.trim() : null;
  const phone =
    (typeof body.phone === "string" && body.phone.trim()) || (typeof body.phone === "number" && Number.isFinite(body.phone))
      ? (body.phone as string | number)
      : null;

  if ((body.mainStatus !== undefined && typeof body.mainStatus !== "string") || (body.secondaryStatus !== undefined && typeof body.secondaryStatus !== "string")) {
    return reply(deps, { error: { message: "סטטוס ראשי ומשני חייבים להיות טקסט כאשר הם נשלחים." } }, 400, "invalid_status_type");
  }
  const rating = parseStudentRatingUpdate(body);
  if (!rating.ok) return reply(deps, { error: { message: rating.error } }, 400, "invalid_rating");

  const fullPaymentParsed = parseOptionalAmount(body.fullPaymentAmount);
  const partialPaymentParsed = parseOptionalAmount(body.partialPaymentAmount);
  if (!fullPaymentParsed.ok || !partialPaymentParsed.ok) {
    return reply(deps, { error: { message: "סכום תשלום אינו תקין - יש להזין מספר חיובי." } }, 400, "invalid_amount");
  }

  const syncInput: CrmSyncInput = {
    leadId,
    phone,
    mainStatus: typeof body.mainStatus === "string" ? body.mainStatus : undefined,
    secondaryStatus: typeof body.secondaryStatus === "string" ? body.secondaryStatus : undefined,
    fullPaymentAmount: fullPaymentParsed.value,
    partialPaymentAmount: partialPaymentParsed.value,
    studentRating: rating.value,
  };

  // The contract is checked before any lookup. A bad status pair or rating is a fault in the sender, not a lead problem.
  const requestCheck = checkCrmSyncRequest(syncInput);
  if (!requestCheck.ok) return reply(deps, { error: { message: requestCheck.error } }, 400, "invalid_request");

  const operation: Operation = requestCheck.statusRequest === null ? "rating" : "status";
  const statusChangedAt = parseStatusChangedAt(body.statusChangedAt);

  try {
    if (leadId === null && phone === null) {
      return await keepUnidentified(deps, {
        input: syncInput,
        leadId,
        phone,
        statusChangedAt,
        operation,
        reason: "missing_identity",
      });
    }

    const index = await deps.loadIndex();
    const result = await syncCrmStatus(syncInput, index, deps.store);

    if (result.ok) {
      await deps.recordCrm({
        leadKey: result.leadId,
        previous: result.previous,
        next: result.record,
        statusChangedAt,
        leadCreatedDate: index.byId.get(result.leadId)?.createdDate,
        now: deps.now(),
      });
      deps.schedule(() => deps.flush(10));
      // Held updates whose lead is now known are completed after every reply (the run lock keeps two retries apart).
      deps.schedule(() => retryOpenUpdates(deps, index));
      return reply(
        deps,
        { ok: true, applied: true, matchedBy: result.matchedBy, leadId: result.leadId, record: result.record },
        200,
        "success",
        { operation, matchedBy: result.matchedBy, recorded: false }
      );
    }

    if (result.code === "invalid_request") {
      return reply(deps, { error: { message: result.message } }, 400, "invalid_request", { operation });
    }

    // Lookup misses: the update is kept. When the Meta list itself was unavailable, the miss is not proof of absence.
    const reason: WebhookPendingReason =
      result.code === "not_found" && !index.metaAvailable ? "meta_unavailable" : result.code === "unverified" ? "unverified_match" : result.code;
    deps.schedule(() => retryOpenUpdates(deps, index));
    return await keepUnidentified(deps, {
      input: syncInput,
      leadId,
      phone,
      statusChangedAt,
      operation,
      reason,
      metaAvailable: index.metaAvailable,
    });
  } catch (error) {
    // Never log the request body: it carries phone numbers and payment amounts. The database messages are fixed Hebrew strings.
    if (isDatabaseError(error)) {
      return reply(deps, { error: { message: error.message } }, 503, "database_error", { operation });
    }
    return reply(deps, { error: { message: "שגיאה לא צפויה בעדכון הסטטוס מה-CRM." } }, 500, "unexpected_error", { operation });
  }
}
