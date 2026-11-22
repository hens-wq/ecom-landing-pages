/**
 * /api/admin/lead-status/pending: review and completion of the pending Fireberry status updates. Pure: the
 * environment, the lead index, the stores and the CRM recorder are passed in, so it is tested without a
 * database or Meta.
 *
 * Authorization: "Authorization: Bearer <LEAD_STATUS_ADMIN_SECRET>", at least 32 characters. The webhook
 * credentials cannot reach these routes. Without the secret: 503. A missing or wrong token: 401.
 *
 *   GET  ?status=open|applied|superseded|dismissed|all   (default open)
 *        &limit=1..200                                    (default 100)
 *        &diagnostics=1                                   (adds lead counts from the Meta index, no personal data)
 *   POST { "action": "replay", "dryRun": true | false, "limit": 1..200 }
 *        { "action": "apply", "id": 12, "leadId": "<a lead the dashboard knows>" }
 *        { "action": "dismiss", "id": 12 }
 *
 * The replies hold the stored phone and payload of each pending update, for the admin who asked for them.
 * They never go to a log.
 */
import { timingSafeEqual } from "node:crypto";

import type { CrmStatusStore, DashboardLeadIndex } from "@/lib/lead-status/crm-sync";
import { replayPendingRows } from "@/lib/lead-status/pending-replay";
import type { CrmChangeRecorder, PendingRow, PendingStatus, PendingStore } from "@/lib/lead-status/pending-core";

export const ADMIN_SECRET_ENV = "LEAD_STATUS_ADMIN_SECRET";
export const MIN_ADMIN_SECRET_LENGTH = 32;

export type AdminAuthResult = { ok: true } | { ok: false; status: 401 | 503; message: string };

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function checkPendingAdminAuthorization(authorization: string | null, configuredSecret: string | undefined): AdminAuthResult {
  const secret = configuredSecret?.trim() ?? "";
  if (!secret) {
    return { ok: false, status: 503, message: "נקודת הניהול אינה מוגדרת (LEAD_STATUS_ADMIN_SECRET חסר בצד השרת)." };
  }
  if (secret.length < MIN_ADMIN_SECRET_LENGTH) {
    return { ok: false, status: 503, message: `LEAD_STATUS_ADMIN_SECRET קצר מדי (נדרשים לפחות ${MIN_ADMIN_SECRET_LENGTH} תווים).` };
  }
  const header = authorization ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  if (!provided || !timingSafeStringEqual(provided, secret)) {
    return { ok: false, status: 401, message: "אימות נכשל." };
  }
  return { ok: true };
}

export interface PendingAdminDeps {
  env: Record<string, string | undefined>;
  now: () => Date;
  loadIndex: () => Promise<DashboardLeadIndex>;
  store: CrmStatusStore;
  pending: PendingStore;
  recordCrm: CrmChangeRecorder;
  schedule: (task: () => Promise<void>) => void;
  flush: (limit: number) => Promise<void>;
}

const STATUS_FILTERS: readonly string[] = ["open", "applied", "superseded", "dismissed", "all"];

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function clampLimit(value: unknown, fallback: number): number {
  const parsed = typeof value === "string" || typeof value === "number" ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(200, Math.max(1, Math.trunc(parsed)));
}

function positiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

function isDatabaseError(error: unknown): error is Error {
  return error instanceof Error && (error.name === "LeadStatusDatabaseError" || error.name === "LandingLeadsDatabaseError");
}

function failureReply(error: unknown): Response {
  if (isDatabaseError(error)) return json({ error: { message: error.message } }, 503);
  return json({ error: { message: "שגיאה לא צפויה בעיבוד העדכונים הממתינים." } }, 500);
}

function publicRow(row: PendingRow) {
  return {
    id: row.id,
    status: row.status,
    reason: row.reason,
    kind: row.kind,
    leadIdHint: row.leadIdHint,
    normalizedPhone: row.normalizedPhone,
    payload: row.payload,
    firstReceivedAt: row.firstReceivedAt.toISOString(),
    lastReceivedAt: row.lastReceivedAt.toISOString(),
    receivedCount: row.receivedCount,
    attempts: row.attempts,
    lastCheckedAt: row.lastCheckedAt === null ? null : row.lastCheckedAt.toISOString(),
    lastError: row.lastError,
    resolvedLeadId: row.resolvedLeadId,
    resolvedAt: row.resolvedAt === null ? null : row.resolvedAt.toISOString(),
  };
}

export async function handlePendingList(request: Request, deps: PendingAdminDeps): Promise<Response> {
  const auth = checkPendingAdminAuthorization(request.headers.get("authorization"), deps.env[ADMIN_SECRET_ENV]);
  if (!auth.ok) return json({ error: { message: auth.message } }, auth.status);

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status") ?? "open";
  if (!STATUS_FILTERS.includes(statusParam)) return json({ error: { message: "ערך status אינו מוכר." } }, 400);
  const limit = clampLimit(url.searchParams.get("limit"), 100);

  try {
    const [items, counts] = await Promise.all([
      deps.pending.list(statusParam as PendingStatus | "all", limit),
      deps.pending.countByStatus(),
    ]);
    const body: Record<string, unknown> = { status: statusParam, counts, items: items.map(publicRow) };
    if (url.searchParams.get("diagnostics") === "1") {
      const index = await deps.loadIndex();
      let withoutPhone = 0;
      for (const info of index.byId.values()) {
        if (!info.normalizedPhone) withoutPhone += 1;
      }
      body.index = { metaAvailable: index.metaAvailable, leads: index.byId.size, leadsWithoutPhone: withoutPhone };
    }
    return json(body, 200);
  } catch (error) {
    return failureReply(error);
  }
}

export async function handlePendingAction(request: Request, deps: PendingAdminDeps): Promise<Response> {
  const auth = checkPendingAdminAuthorization(request.headers.get("authorization"), deps.env[ADMIN_SECRET_ENV]);
  if (!auth.ok) return json({ error: { message: auth.message } }, auth.status);

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) throw new TypeError("Expected JSON object");
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ error: { message: "גוף הבקשה אינו JSON תקין." } }, 400);
  }

  try {
    if (body.action === "replay") {
      const dryRun = body.dryRun === true;
      const limit = clampLimit(body.limit, 100);
      const index = await deps.loadIndex();
      if (!index.metaAvailable) {
        return json({ error: { message: "קריאת הלידים מ-Meta אינה זמינה. לא בוצע שום שינוי.", retryable: true } }, 503);
      }
      const rows = await deps.pending.listOpen(limit);
      const report = await replayPendingRows(rows, {
        index,
        store: deps.store,
        pending: deps.pending,
        recordCrm: deps.recordCrm,
        now: deps.now(),
        dryRun,
      });
      if (!dryRun && report.counts.applied > 0) deps.schedule(() => deps.flush(20));
      return json({ ok: true, ...report }, 200);
    }

    if (body.action === "apply") {
      const id = positiveInteger(body.id);
      const leadId = typeof body.leadId === "string" ? body.leadId.trim() : "";
      if (id === null || !leadId) return json({ error: { message: "נדרשים id (מספר) ו-leadId." } }, 400);
      const row = await deps.pending.get(id);
      if (!row || row.status !== "open") return json({ error: { message: "אין עדכון פתוח עם המזהה הזה." } }, 404);
      const index = await deps.loadIndex();
      if (!index.metaAvailable) {
        return json({ error: { message: "קריאת הלידים מ-Meta אינה זמינה. לא בוצע שום שינוי.", retryable: true } }, 503);
      }
      if (!index.byId.has(leadId)) return json({ error: { message: "הליד אינו מוכר לדשבורד. לא בוצע שום שינוי." } }, 400);
      const report = await replayPendingRows([row], {
        index,
        store: deps.store,
        pending: deps.pending,
        recordCrm: deps.recordCrm,
        now: deps.now(),
        dryRun: false,
        forcedLeadId: leadId,
      });
      if (report.counts.applied > 0) deps.schedule(() => deps.flush(20));
      return json({ ok: true, ...report }, 200);
    }

    if (body.action === "dismiss") {
      const id = positiveInteger(body.id);
      if (id === null) return json({ error: { message: "נדרש id (מספר)." } }, 400);
      const row = await deps.pending.get(id);
      if (!row || row.status !== "open") return json({ error: { message: "אין עדכון פתוח עם המזהה הזה." } }, 404);
      await deps.pending.markDismissed(id);
      return json({ ok: true, id, status: "dismissed" }, 200);
    }

    return json({ error: { message: "פעולה לא מוכרת. האפשרויות: replay, apply, dismiss." } }, 400);
  } catch (error) {
    return failureReply(error);
  }
}
