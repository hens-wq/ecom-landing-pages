/**
 * /api/admin/lead-status/pending: review and completion of the held Fireberry updates. Pure: the environment, the
 * lead index, the stores, the CRM settings and the recorder are passed in, so it is tested without a database or Meta.
 *
 * Authorization: "Authorization: Bearer <LEAD_STATUS_ADMIN_SECRET>", at least 32 characters. The webhook credentials
 * cannot reach these routes. Without the secret: 503. A missing or wrong token: 401.
 *
 *   GET  ?status=open|applied|superseded|dismissed|all   (default open)
 *        &limit=1..200                                    (default 100)
 *        &diagnostics=1                                   (adds index counts and the open updates by reason)
 *        &id=<pending id>&candidates=1                    (the leads that share the update's phone, to choose from)
 *   POST { "action": "replay", "dryRun": true | false, "limit": 1..200 }
 *        { "action": "apply", "id": 12, "leadId": "<a lead the dashboard knows>" }
 *        { "action": "dismiss", "id": 12 }
 *        { "action": "import", "exportedAt": "<ISO time the export was taken>", "dryRun": true | false, "rows": [...] }
 *
 * Held updates are also retried by the webhook itself, after each reply. One completion run at a time: a real replay
 * or an apply takes the run lock, and while another run holds it the reply is 409.
 *
 * The replies hold the stored phone and payload of each pending update, for the admin who asked for them. They
 * never go to a log.
 */
import { randomUUID, timingSafeEqual } from "node:crypto";

import type { CrmStatusStore, DashboardLeadIndex } from "@/lib/lead-status/crm-sync";
import { parseImportRows } from "@/lib/lead-status/pending-import";
import { replayPendingRows, type ReplayCrmPreview } from "@/lib/lead-status/pending-replay";
import {
  RUN_LEASE_SECONDS,
  type CrmChangeRecorder,
  type NewPendingUpdate,
  type PendingRow,
  type PendingStatus,
  type PendingStore,
} from "@/lib/lead-status/pending-core";
import { normalizeIsraeliPhone } from "@/lib/phone";

export const ADMIN_SECRET_ENV = "LEAD_STATUS_ADMIN_SECRET";
export const MIN_ADMIN_SECRET_LENGTH = 32;

/** An export time may be at most this far ahead of the clock (a small allowance for clock drift). */
const FUTURE_ALLOWANCE_MS = 5 * 60 * 1000;
/** An export older than this is refused: its rows no longer describe the current state. */
const MAX_EXPORT_AGE_MS = 180 * 24 * 60 * 60 * 1000;

const BUSY_MESSAGE = "ריצת השלמה אחרת פעילה כרגע. לא בוצע שום שינוי. נסו שוב בעוד כמה דקות.";

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
  /** The CRM settings and the outbox check that a dry run reports. */
  crm: ReplayCrmPreview;
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
    sourceAt: row.sourceAt.toISOString(),
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

/** The export time of an import: a valid ISO time, not ahead of the clock, not older than the limit. */
function parseExportedAt(value: unknown, now: Date): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value.trim());
  if (Number.isNaN(parsed.getTime())) return null;
  if (parsed.getTime() > now.getTime() + FUTURE_ALLOWANCE_MS) return null;
  if (now.getTime() - parsed.getTime() > MAX_EXPORT_AGE_MS) return null;
  return parsed;
}

/** An import row as a pending row, so a dry run judges it with the same rules as a stored one. Its id is its 1-based position. */
function asPendingRow(position: number, update: NewPendingUpdate, now: Date): PendingRow {
  return {
    id: position + 1,
    status: "open",
    reason: update.reason,
    kind: update.kind,
    leadIdHint: update.leadIdHint,
    normalizedPhone: update.normalizedPhone,
    payload: update.payload,
    sourceAt: update.sourceAt,
    firstReceivedAt: now,
    lastReceivedAt: now,
    receivedCount: 1,
    attempts: 0,
    lastCheckedAt: null,
    lastError: null,
    resolvedLeadId: null,
    resolvedAt: null,
  };
}

/** Runs `work` while holding the run lock. Returns "busy" when another run holds it. */
async function withRunLock<T>(deps: PendingAdminDeps, work: () => Promise<T>): Promise<T | "busy"> {
  const holder = randomUUID();
  if (!(await deps.pending.tryAcquireRun(holder, RUN_LEASE_SECONDS))) return "busy";
  try {
    return await work();
  } finally {
    await deps.pending.releaseRun(holder).catch(() => undefined);
  }
}

type MatchKind = "standard_phone" | "custom_question" | "stored_match";

/**
 * The leads that could be the one an update belongs to, when its phone matches more than one lead. Lead IDs and
 * statuses only: no names and no phone numbers. Nothing is chosen here; the admin chooses, or dismisses the update.
 */
async function candidatesFor(row: PendingRow, deps: PendingAdminDeps) {
  const index = await deps.loadIndex();
  const kinds = new Map<string, MatchKind>();
  const phone = row.normalizedPhone;
  if (phone) {
    for (const info of index.byId.values()) {
      if (info.normalizedPhone && normalizeIsraeliPhone(info.normalizedPhone) === phone) kinds.set(info.id, "standard_phone");
      else if (info.matchPhone && normalizeIsraeliPhone(info.matchPhone) === phone) kinds.set(info.id, "custom_question");
    }
    for (const leadId of await deps.store.findLeadIdsByNormalizedPhone(phone)) {
      if (!kinds.has(leadId)) kinds.set(leadId, "stored_match");
    }
  }
  const list: {
    leadId: string;
    matchKind: MatchKind;
    createdDate: string | null;
    mainStatus: string | null;
    secondaryStatus: string | null;
    studentRating: number | null;
  }[] = [];
  for (const [leadId, matchKind] of kinds) {
    const record = await deps.store.get(leadId);
    list.push({
      leadId,
      matchKind,
      createdDate: index.byId.get(leadId)?.createdDate ?? null,
      mainStatus: record?.mainStatus ?? null,
      secondaryStatus: record?.secondaryStatus ?? null,
      studentRating: record?.studentRating ?? null,
    });
  }
  return list;
}

export async function handlePendingList(request: Request, deps: PendingAdminDeps): Promise<Response> {
  const auth = checkPendingAdminAuthorization(request.headers.get("authorization"), deps.env[ADMIN_SECRET_ENV]);
  if (!auth.ok) return json({ error: { message: auth.message } }, auth.status);

  const url = new URL(request.url);

  const idParam = url.searchParams.get("id");
  if (idParam !== null) {
    const id = positiveInteger(Number(idParam));
    if (id === null) return json({ error: { message: "id אינו מספר תקין." } }, 400);
    try {
      const row = await deps.pending.get(id);
      if (!row) return json({ error: { message: "אין עדכון עם המזהה הזה." } }, 404);
      if (url.searchParams.get("candidates") !== "1") return json({ item: publicRow(row) }, 200);
      return json(
        {
          item: publicRow(row),
          candidates: await candidatesFor(row, deps),
          note: "לא נבחר ליד אוטומטית. בחרו ליד ב-apply, או סגרו את העדכון ב-dismiss.",
        },
        200
      );
    } catch (error) {
      return failureReply(error);
    }
  }

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
      // Monitoring: how many open updates wait, for which reason, and since when.
      body.open = await deps.pending.openSummary();
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
      const work = async () => {
        const rows = await deps.pending.listOpen(limit);
        const report = await replayPendingRows(rows, {
          index,
          store: deps.store,
          pending: deps.pending,
          recordCrm: deps.recordCrm,
          now: deps.now(),
          dryRun,
          crm: deps.crm,
        });
        if (!dryRun && report.counts.applied > 0) deps.schedule(() => deps.flush(20));
        return report;
      };
      const outcome = dryRun ? await work() : await withRunLock(deps, work);
      if (outcome === "busy") return json({ error: { message: BUSY_MESSAGE, busy: true } }, 409);
      return json({ ok: true, ...outcome }, 200);
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
      const outcome = await withRunLock(deps, async () => {
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
        return report;
      });
      if (outcome === "busy") return json({ error: { message: BUSY_MESSAGE, busy: true } }, 409);
      return json({ ok: true, ...outcome }, 200);
    }

    if (body.action === "import") {
      // Ratings Fireberry recorded while the automation was off. One export time for the whole file (see pending-import.ts).
      const dryRun = body.dryRun === true;
      const exportedAt = parseExportedAt(body.exportedAt, deps.now());
      if (exportedAt === null) {
        return json({ error: { message: "exportedAt חייב להיות זמן ISO של תחילת הייצוא: לא עתידי, ולא ישן מ-180 יום." } }, 400);
      }
      if (!Array.isArray(body.rows) || body.rows.length === 0 || body.rows.length > 500) {
        return json({ error: { message: "rows: מערך של 1 עד 500 שורות." } }, 400);
      }
      const parsed = parseImportRows(body.rows, exportedAt);
      if (dryRun) {
        // The replay's own rules, without writing: each valid row judged as it would be stored, with its CRM preview.
        const index = await deps.loadIndex();
        if (!index.metaAvailable) {
          return json({ error: { message: "קריאת הלידים מ-Meta אינה זמינה. לא בוצע שום שינוי.", retryable: true } }, 503);
        }
        const now = deps.now();
        const report = await replayPendingRows(
          parsed.valid.map((row) => asPendingRow(row.index, row.update, now)),
          { index, store: deps.store, pending: deps.pending, recordCrm: deps.recordCrm, now, dryRun: true, crm: deps.crm }
        );
        return json(
          {
            ok: true,
            dryRun: true,
            exportedAt: exportedAt.toISOString(),
            received: body.rows.length,
            valid: parsed.valid.length,
            invalid: parsed.invalid,
            preview: report,
          },
          200
        );
      }
      let stored = 0;
      let repeated = 0;
      for (const row of parsed.valid) {
        const result = await deps.pending.insert(row.update);
        if (result.inserted) stored += 1;
        else repeated += 1;
      }
      return json(
        { ok: true, dryRun: false, exportedAt: exportedAt.toISOString(), received: body.rows.length, stored, repeated, invalid: parsed.invalid },
        200
      );
    }

    if (body.action === "dismiss") {
      const id = positiveInteger(body.id);
      if (id === null) return json({ error: { message: "נדרש id (מספר)." } }, 400);
      const row = await deps.pending.get(id);
      if (!row || row.status !== "open") return json({ error: { message: "אין עדכון פתוח עם המזהה הזה." } }, 404);
      await deps.pending.markDismissed(id);
      return json({ ok: true, id, status: "dismissed" }, 200);
    }

    return json({ error: { message: "פעולה לא מוכרת. האפשרויות: replay, apply, import, dismiss." } }, 400);
  } catch (error) {
    return failureReply(error);
  }
}
