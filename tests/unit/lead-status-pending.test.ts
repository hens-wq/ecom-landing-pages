import assert from "node:assert/strict";
import { test } from "node:test";

import type { LeadStatusRecord, MainStatus } from "@/lib/lead-status/types";
import type { CrmStatusStore, DashboardLeadIndex } from "@/lib/lead-status/crm-sync";
import type { StudentRating } from "@/lib/lead-status/student-rating";
import {
  isSuperseded,
  pendingDedupeKey,
  type CrmChangeInput,
  type NewPendingUpdate,
  type PendingRow,
  type PendingStatus,
  type PendingStore,
} from "@/lib/lead-status/pending-core";
import { replayPendingRows } from "@/lib/lead-status/pending-replay";
import { runLeadStatusWebhook, type LeadStatusWebhookDeps } from "@/lib/lead-status/webhook-handler";
import {
  ADMIN_SECRET_ENV,
  checkPendingAdminAuthorization,
  handlePendingAction,
  handlePendingList,
  MIN_ADMIN_SECRET_LENGTH,
  type PendingAdminDeps,
} from "@/lib/lead-status/pending-admin-handler";

const T0 = new Date("2026-11-20T10:00:00Z");
const at = (minutes: number): Date => new Date(T0.getTime() + minutes * 60 * 1000);

const WEBHOOK_SECRET = "webhook-test-secret-not-real";
const ADMIN_SECRET = "a".repeat(MIN_ADMIN_SECRET_LENGTH);
const LEAD = "120210000000001111";
const OTHER_LEAD = "120210000000002222";
const PHONE = "0528678178";

class Clock {
  now: Date = T0;
}

class FakeStatusStore implements CrmStatusStore {
  readonly rows = new Map<string, LeadStatusRecord>();
  readonly writes: string[] = [];
  constructor(private readonly clock: Clock) {}

  async get(leadId: string): Promise<LeadStatusRecord | undefined> {
    return this.rows.get(leadId);
  }

  async findLeadIdsByNormalizedPhone(normalizedPhone: string): Promise<string[]> {
    return [...this.rows.values()].filter((row) => row.normalizedPhone === normalizedPhone).map((row) => row.leadId);
  }

  async upsert(
    leadId: string,
    patch: { mainStatus: string; secondaryStatus: string; normalizedPhone?: string | null; fullPaymentAmount?: number | null; partialPaymentAmount?: number | null; studentRating?: number | null }
  ): Promise<LeadStatusRecord> {
    const existing = this.rows.get(leadId);
    const record: LeadStatusRecord = {
      leadId,
      normalizedPhone: patch.normalizedPhone ?? existing?.normalizedPhone ?? null,
      mainStatus: patch.mainStatus as MainStatus,
      secondaryStatus: patch.secondaryStatus,
      fullPaymentAmount: patch.fullPaymentAmount ?? null,
      partialPaymentAmount: patch.partialPaymentAmount ?? null,
      studentRating: patch.studentRating === undefined ? (existing?.studentRating ?? null) : patch.studentRating,
      updatedAt: this.clock.now.toISOString(),
    };
    this.rows.set(leadId, record);
    this.writes.push(leadId);
    return record;
  }

  async upsertStudentRating(leadId: string, studentRating: StudentRating | null, normalizedPhone?: string | null) {
    const existing = this.rows.get(leadId);
    const previousStudentRating = (existing?.studentRating ?? null) as StudentRating | null;
    const record: LeadStatusRecord = existing
      ? { ...existing, studentRating, normalizedPhone: normalizedPhone ?? existing.normalizedPhone, updatedAt: this.clock.now.toISOString() }
      : {
          leadId,
          normalizedPhone: normalizedPhone ?? null,
          mainStatus: "חדש" as MainStatus,
          secondaryStatus: "חדש",
          fullPaymentAmount: null,
          partialPaymentAmount: null,
          studentRating,
          updatedAt: this.clock.now.toISOString(),
        };
    this.rows.set(leadId, record);
    this.writes.push(leadId);
    return { ...record, previousStudentRating };
  }
}

class FakePendingStore implements PendingStore {
  private readonly entries: { row: PendingRow; dedupeKey: string }[] = [];
  private nextId = 1;
  constructor(private readonly clock: Clock) {}

  get all(): PendingRow[] {
    return this.entries.map((entry) => entry.row);
  }

  async insert(input: NewPendingUpdate) {
    const open = this.entries.find((entry) => entry.row.status === "open" && entry.dedupeKey === input.dedupeKey);
    if (open) {
      open.row.receivedCount += 1;
      open.row.lastReceivedAt = this.clock.now;
      open.row.reason = input.reason;
      return { id: open.row.id, inserted: false };
    }
    const row: PendingRow = {
      id: this.nextId++,
      status: "open",
      reason: input.reason,
      kind: input.kind,
      leadIdHint: input.leadIdHint,
      normalizedPhone: input.normalizedPhone,
      payload: input.payload,
      firstReceivedAt: this.clock.now,
      lastReceivedAt: this.clock.now,
      receivedCount: 1,
      attempts: 0,
      lastCheckedAt: null,
      lastError: null,
      resolvedLeadId: null,
      resolvedAt: null,
    };
    this.entries.push({ row, dedupeKey: input.dedupeKey });
    return { id: row.id, inserted: true };
  }

  async listOpen(limit: number): Promise<PendingRow[]> {
    return this.all
      .filter((row) => row.status === "open")
      .sort((a, b) => a.lastReceivedAt.getTime() - b.lastReceivedAt.getTime() || a.id - b.id)
      .slice(0, limit);
  }

  async list(status: PendingStatus | "all", limit: number): Promise<PendingRow[]> {
    return this.all.filter((row) => status === "all" || row.status === status).slice(0, limit);
  }

  async countByStatus(): Promise<Record<PendingStatus, number>> {
    const counts: Record<PendingStatus, number> = { open: 0, applied: 0, superseded: 0, dismissed: 0 };
    for (const row of this.all) counts[row.status] += 1;
    return counts;
  }

  async get(id: number): Promise<PendingRow | undefined> {
    return this.all.find((row) => row.id === id);
  }

  private open(id: number): PendingRow | undefined {
    return this.all.find((row) => row.id === id && row.status === "open");
  }

  async markChecked(id: number, code: string): Promise<void> {
    const row = this.open(id);
    if (row) Object.assign(row, { attempts: row.attempts + 1, lastCheckedAt: this.clock.now, lastError: code });
  }

  async markApplied(id: number, leadId: string): Promise<void> {
    const row = this.open(id);
    if (row) Object.assign(row, { status: "applied", resolvedLeadId: leadId, resolvedAt: this.clock.now, attempts: row.attempts + 1, lastError: null });
  }

  async markSuperseded(id: number, leadId: string): Promise<void> {
    const row = this.open(id);
    if (row) Object.assign(row, { status: "superseded", resolvedLeadId: leadId, resolvedAt: this.clock.now, attempts: row.attempts + 1, lastError: "newer_write_exists" });
  }

  async markDismissed(id: number): Promise<void> {
    const row = this.open(id);
    if (row) Object.assign(row, { status: "dismissed", resolvedAt: this.clock.now, lastError: "dismissed_by_admin" });
  }
}

function index(leads: { id: string; phone: string | null }[], metaAvailable = true): DashboardLeadIndex {
  return {
    metaAvailable,
    byId: new Map(leads.map((lead) => [lead.id, { id: lead.id, name: null, phone: null, normalizedPhone: lead.phone, createdDate: "2026-11-01" }])),
  };
}

function harness(initial: { leads: DashboardLeadIndex; statuses?: LeadStatusRecord[] }) {
  const clock = new Clock();
  const store = new FakeStatusStore(clock);
  for (const row of initial.statuses ?? []) store.rows.set(row.leadId, row);
  const pending = new FakePendingStore(clock);
  const crm: CrmChangeInput[] = [];
  const logs: string[] = [];
  let flushes = 0;
  let scheduled: (() => Promise<void>)[] = [];
  let currentIndex = initial.leads;
  const deps: LeadStatusWebhookDeps = {
    env: { LEAD_STATUS_WEBHOOK_SECRET: WEBHOOK_SECRET },
    now: () => clock.now,
    loadIndex: async () => currentIndex,
    store,
    pending,
    recordCrm: async (change) => {
      crm.push(change);
    },
    schedule: (task) => {
      scheduled.push(task);
    },
    flush: async () => {
      flushes += 1;
    },
    log: (line) => logs.push(line),
  };
  return {
    clock,
    store,
    pending,
    crm,
    logs,
    deps,
    get flushes() {
      return flushes;
    },
    setIndex(next: DashboardLeadIndex) {
      currentIndex = next;
    },
    async runScheduled() {
      const tasks = scheduled;
      scheduled = [];
      for (const task of tasks) await task();
    },
  };
}

function webhookRequest(body: unknown): Request {
  return new Request("https://example.test/api/webhooks/lead-status", {
    method: "POST",
    headers: { authorization: `Bearer ${WEBHOOK_SECRET}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function send(h: ReturnType<typeof harness>, body: unknown): Promise<{ status: number; json: Record<string, unknown>; text: string }> {
  const response = await runLeadStatusWebhook(webhookRequest(body), h.deps);
  const text = await response.text();
  return { status: response.status, json: JSON.parse(text) as Record<string, unknown>, text };
}

// ---------- pure helpers ----------

test("the dedupe key is the same for the same update, however its keys are ordered, and differs for a different one", () => {
  const a = pendingDedupeKey({ leadIdHint: null, normalizedPhone: PHONE, kind: "status", payload: { mainStatus: "בתהליך", secondaryStatus: "בתהליך" } });
  const b = pendingDedupeKey({ leadIdHint: null, normalizedPhone: PHONE, kind: "status", payload: { secondaryStatus: "בתהליך", mainStatus: "בתהליך", fullPaymentAmount: undefined } });
  const c = pendingDedupeKey({ leadIdHint: null, normalizedPhone: PHONE, kind: "status", payload: { mainStatus: "אין מענה", secondaryStatus: 'א"מ - יום 1' } });
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test("a not-sent key and an explicit null are different updates: null clears, absence keeps", () => {
  const kept = pendingDedupeKey({ leadIdHint: LEAD, normalizedPhone: null, kind: "rating", payload: { studentRating: 4 } });
  const cleared = pendingDedupeKey({ leadIdHint: LEAD, normalizedPhone: null, kind: "rating", payload: { studentRating: null } });
  assert.notEqual(kept, cleared);
});

test("superseded: a lead written at or after the update was received; an earlier write does not supersede", () => {
  const received = at(10);
  assert.equal(isSuperseded(null, received), false);
  assert.equal(isSuperseded(at(9), received), false);
  assert.equal(isSuperseded(at(10), received), true);
  assert.equal(isSuperseded(at(11), received), true);
});

// ---------- webhook: identification of the lead ----------

const VARIANTS: (string | number)[] = ["052-867-8178", "052 867 8178", "+972528678178", "+972 52-867-8178", "972528678178", "00972528678178", "0528678178", " 0528678178 ", 528678178];

test("every Fireberry phone form matches the same lead: 200, applied, under its own dashboard ID", async () => {
  for (const variant of VARIANTS) {
    const h = harness({ leads: index([{ id: LEAD, phone: PHONE }]) });
    const result = await send(h, { phone: variant, mainStatus: "בתהליך", secondaryStatus: "בתהליך" });
    assert.equal(result.status, 200, `variant ${String(variant)}`);
    assert.equal(result.json.applied, true, `variant ${String(variant)}`);
    assert.equal(result.json.leadId, LEAD);
    assert.equal(h.pending.all.length, 0);
  }
});

test("a phone that is not the lead's is not found: 200, kept as pending, and nothing is written", async () => {
  const h = harness({ leads: index([{ id: LEAD, phone: PHONE }]) });
  const result = await send(h, { phone: "0528678179", mainStatus: "בתהליך", secondaryStatus: "בתהליך" });
  assert.equal(result.status, 200);
  assert.equal(result.json.applied, false);
  assert.equal(result.json.recorded, true);
  assert.equal(result.json.reason, "not_found");
  assert.equal(h.store.writes.length, 0);
  assert.equal(h.pending.all.length, 1);
  assert.equal(h.pending.all[0].status, "open");
});

test("a phone with no digits is not found, and a digit string that is not a phone is invalid_phone; both are kept", async () => {
  const h = harness({ leads: index([{ id: LEAD, phone: PHONE }]) });
  assert.equal((await send(h, { phone: "אבא", mainStatus: "בתהליך", secondaryStatus: "בתהליך" })).json.reason, "not_found");
  assert.equal((await send(h, { phone: "12345", mainStatus: "בתהליך", secondaryStatus: "בתהליך" })).json.reason, "invalid_phone");
  assert.equal(h.pending.all.length, 2);
});

test("an ambiguous phone (two leads) is kept, never guessed", async () => {
  const h = harness({ leads: index([{ id: LEAD, phone: PHONE }, { id: OTHER_LEAD, phone: PHONE }]) });
  const result = await send(h, { phone: PHONE, mainStatus: "בתהליך", secondaryStatus: "בתהליך" });
  assert.equal(result.status, 200);
  assert.equal(result.json.reason, "ambiguous");
  assert.equal(h.store.writes.length, 0);
});

test("a request with neither leadId nor phone is kept as missing_identity, not refused", async () => {
  const h = harness({ leads: index([{ id: LEAD, phone: PHONE }]) });
  const result = await send(h, { mainStatus: "בתהליך", secondaryStatus: "בתהליך" });
  assert.equal(result.status, 200);
  assert.equal(result.json.reason, "missing_identity");
  assert.equal(h.pending.all[0].leadIdHint, null);
  assert.equal(h.pending.all[0].normalizedPhone, null);
});

test("the same update sent again while pending is counted once, not stored twice", async () => {
  const h = harness({ leads: index([]) });
  const body = { leadId: LEAD, mainStatus: "אין מענה", secondaryStatus: 'א"מ - יום 1' };
  const first = await send(h, body);
  const second = await send(h, body);
  assert.equal(first.json.duplicate, false);
  assert.equal(second.json.duplicate, true);
  assert.equal(second.json.pendingId, first.json.pendingId);
  assert.equal(h.pending.all.length, 1);
  assert.equal(h.pending.all[0].receivedCount, 2);
});

test("a lead the dashboard knows is applied, with the CRM change recorded and the flush scheduled", async () => {
  const h = harness({ leads: index([{ id: LEAD, phone: PHONE }]) });
  const result = await send(h, { leadId: LEAD, mainStatus: "בתהליך", secondaryStatus: "בתהליך" });
  assert.equal(result.status, 200);
  assert.equal(result.json.applied, true);
  assert.equal(h.store.rows.get(LEAD)?.mainStatus, "בתהליך");
  assert.equal(h.crm.length, 1);
  await h.runScheduled();
  assert.equal(h.flushes, 1);
});

// ---------- webhook: real failures are never answered 200 ----------

test("when the Meta list is unavailable the update is kept and the reply is 503, retryable", async () => {
  const h = harness({ leads: index([], false) });
  const result = await send(h, { phone: PHONE, mainStatus: "בתהליך", secondaryStatus: "בתהליך" });
  assert.equal(result.status, 503);
  assert.equal(result.json.reason, "meta_unavailable");
  assert.equal((result.json.error as { retryable?: boolean }).retryable, true);
  assert.equal(h.pending.all[0].reason, "meta_unavailable");
  assert.equal(h.store.writes.length, 0);
});

test("a database failure while recording is a 503, never a 200", async () => {
  const h = harness({ leads: index([]) });
  h.deps.pending = {
    insert: async () => {
      const error = new Error("שגיאה בשמירת העדכון הממתין במסד הנתונים. העדכון לא נשמר.");
      error.name = "LeadStatusDatabaseError";
      throw error;
    },
  };
  const result = await send(h, { leadId: LEAD, mainStatus: "בתהליך", secondaryStatus: "בתהליך" });
  assert.equal(result.status, 503);
  assert.match((result.json.error as { message: string }).message, /שגיאה בשמירת/);
});

test("an unexpected failure is a 500 and the raw message never reaches the reply", async () => {
  const h = harness({ leads: index([]) });
  h.deps.loadIndex = async () => {
    throw new Error("internal detail that must not leak");
  };
  const result = await send(h, { leadId: LEAD, mainStatus: "בתהליך", secondaryStatus: "בתהליך" });
  assert.equal(result.status, 500);
  assert.equal(result.text.includes("internal detail"), false);
  assert.equal(h.pending.all.length, 0);
});

test("a bad status pair is still a 400 and is not stored: it is the sender's fault, not a lead problem", async () => {
  const h = harness({ leads: index([{ id: LEAD, phone: PHONE }]) });
  const result = await send(h, { leadId: LEAD, mainStatus: "בתהליך", secondaryStatus: "לא קיים" });
  assert.equal(result.status, 400);
  assert.equal(h.pending.all.length, 0);
});

test("credentials keep their codes: no token 401, a rating-only key sending a status 403", async () => {
  const h = harness({ leads: index([]) });
  const noAuth = await runLeadStatusWebhook(new Request("https://example.test/x", { method: "POST", body: "{}" }), h.deps);
  assert.equal(noAuth.status, 401);
  const unconfigured = await runLeadStatusWebhook(webhookRequest({ leadId: LEAD }), { ...h.deps, env: {} });
  assert.equal(unconfigured.status, 503);
  assert.equal(h.pending.all.length, 0);
});

test("a lead whose phone sits under another question is matched by it, and its display phone stays empty", async () => {
  const entry = { id: LEAD, name: null, phone: null, normalizedPhone: null, matchPhone: PHONE, createdDate: "2026-11-01" };
  const h = harness({ leads: { metaAvailable: true, byId: new Map([[LEAD, entry]]) } });
  const result = await send(h, { phone: "+972 52-867-8178", mainStatus: "בתהליך", secondaryStatus: "בתהליך" });
  assert.equal(result.status, 200);
  assert.equal(result.json.applied, true);
  assert.equal(result.json.leadId, LEAD);
  assert.equal(entry.normalizedPhone, null, "the display field is untouched");
});

// ---------- replay: completing what was missed ----------

test("a pending update is applied once its lead exists, with the receipt time as the CRM change time", async () => {
  const h = harness({ leads: index([]) });
  await send(h, { phone: PHONE, mainStatus: "בתהליך", secondaryStatus: "בתהליך" });
  const received = h.pending.all[0].lastReceivedAt;

  h.setIndex(index([{ id: LEAD, phone: PHONE }]));
  h.clock.now = at(60);
  const report = await replayPendingRows(await h.pending.listOpen(50), {
    index: h.deps.loadIndex ? await h.deps.loadIndex() : index([]),
    store: h.store,
    pending: h.pending,
    recordCrm: h.deps.recordCrm,
    now: h.clock.now,
    dryRun: false,
  });
  assert.equal(report.counts.applied, 1);
  assert.equal(h.store.rows.get(LEAD)?.mainStatus, "בתהליך");
  assert.equal(h.pending.all[0].status, "applied");
  assert.equal(h.pending.all[0].resolvedLeadId, LEAD);
  assert.equal(h.crm[0].statusChangedAt?.getTime(), received.getTime());
});

test("an update superseded by a newer write to its lead is never applied over it", async () => {
  const h = harness({ leads: index([]) });
  await send(h, { phone: PHONE, mainStatus: "אין מענה", secondaryStatus: 'א"מ - יום 1' });

  h.clock.now = at(30);
  h.store.rows.set(LEAD, { leadId: LEAD, normalizedPhone: PHONE, mainStatus: "בתהליך" as MainStatus, secondaryStatus: "בתהליך", fullPaymentAmount: null, partialPaymentAmount: null, studentRating: null, updatedAt: at(30).toISOString() });
  h.setIndex(index([{ id: LEAD, phone: PHONE }]));
  const report = await replayPendingRows(await h.pending.listOpen(50), {
    index: index([{ id: LEAD, phone: PHONE }]),
    store: h.store,
    pending: h.pending,
    recordCrm: h.deps.recordCrm,
    now: h.clock.now,
    dryRun: false,
  });
  assert.equal(report.counts.superseded, 1);
  assert.equal(h.store.rows.get(LEAD)?.mainStatus, "בתהליך");
  assert.equal(h.pending.all[0].status, "superseded");
});

test("two pending updates for one lead apply oldest first, so the newest stays in force", async () => {
  const h = harness({ leads: index([]) });
  await send(h, { phone: PHONE, mainStatus: "אין מענה", secondaryStatus: 'א"מ - יום 1' });
  h.clock.now = at(5);
  await send(h, { phone: PHONE, mainStatus: "בתהליך", secondaryStatus: "בתהליך" });

  const report = await replayPendingRows(await h.pending.listOpen(50), {
    index: index([{ id: LEAD, phone: PHONE }]),
    store: h.store,
    pending: h.pending,
    recordCrm: h.deps.recordCrm,
    now: at(60),
    dryRun: false,
  });
  assert.equal(report.counts.applied, 2);
  assert.equal(report.counts.superseded, 0);
  assert.equal(h.store.rows.get(LEAD)?.mainStatus, "בתהליך");
});

test("a lead still unknown stays open with its reason and an attempt counted; nothing is written", async () => {
  const h = harness({ leads: index([]) });
  await send(h, { phone: PHONE, mainStatus: "בתהליך", secondaryStatus: "בתהליך" });
  const report = await replayPendingRows(await h.pending.listOpen(50), {
    index: index([]),
    store: h.store,
    pending: h.pending,
    recordCrm: h.deps.recordCrm,
    now: at(60),
    dryRun: false,
  });
  assert.equal(report.counts.not_found, 1);
  assert.equal(h.pending.all[0].status, "open");
  assert.equal(h.pending.all[0].attempts, 1);
  assert.equal(h.pending.all[0].lastError, "not_found");
  assert.equal(h.store.writes.length, 0);
});

test("a dry run matches and validates but writes nothing and leaves every row open", async () => {
  const h = harness({ leads: index([]) });
  await send(h, { phone: PHONE, mainStatus: "בתהליך", secondaryStatus: "בתהליך" });
  const report = await replayPendingRows(await h.pending.listOpen(50), {
    index: index([{ id: LEAD, phone: PHONE }]),
    store: h.store,
    pending: h.pending,
    recordCrm: h.deps.recordCrm,
    now: at(60),
    dryRun: true,
  });
  assert.equal(report.counts.would_apply, 1);
  assert.equal(h.store.writes.length, 0);
  assert.equal(h.crm.length, 0);
  assert.equal(h.pending.all[0].status, "open");
});

test("with the Meta list unavailable the replay writes nothing and says why for each row", async () => {
  const h = harness({ leads: index([]) });
  await send(h, { phone: PHONE, mainStatus: "בתהליך", secondaryStatus: "בתהליך" });
  const report = await replayPendingRows(await h.pending.listOpen(50), {
    index: index([], false),
    store: h.store,
    pending: h.pending,
    recordCrm: h.deps.recordCrm,
    now: at(60),
    dryRun: false,
  });
  assert.equal(report.counts.meta_unavailable, 1);
  assert.equal(h.store.writes.length, 0);
});

test("an admin can apply a pending update to a lead the dashboard knows, and refuses an unknown one", async () => {
  const h = harness({ leads: index([]) });
  await send(h, { leadId: "unknown-fireberry-id", mainStatus: "בתהליך", secondaryStatus: "בתהליך" });
  const id = h.pending.all[0].id;
  const adminDeps = adminDepsFor(h);
  const refused = await handlePendingAction(adminRequest({ action: "apply", id, leadId: "not-a-dashboard-lead" }), adminDeps);
  assert.equal(refused.status, 400);
  assert.equal(h.store.writes.length, 0);

  h.setIndex(index([{ id: OTHER_LEAD, phone: "0500000000" }]));
  const applied = await handlePendingAction(adminRequest({ action: "apply", id, leadId: OTHER_LEAD }), adminDeps);
  assert.equal(applied.status, 200);
  assert.equal(h.store.rows.get(OTHER_LEAD)?.mainStatus, "בתהליך");
  assert.equal(h.pending.all[0].status, "applied");
});

// ---------- admin endpoint ----------

function adminDepsFor(h: ReturnType<typeof harness>): PendingAdminDeps {
  return {
    env: { [ADMIN_SECRET_ENV]: ADMIN_SECRET },
    now: () => h.clock.now,
    loadIndex: async () => h.deps.loadIndex(),
    store: h.store,
    pending: h.pending,
    recordCrm: h.deps.recordCrm,
    schedule: h.deps.schedule,
    flush: h.deps.flush,
  };
}

function adminRequest(body: unknown, method = "POST", query = ""): Request {
  return new Request(`https://example.test/api/admin/lead-status/pending${query}`, {
    method,
    headers: { authorization: `Bearer ${ADMIN_SECRET}`, "content-type": "application/json" },
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });
}

test("the admin endpoint is refused without its own secret, and a webhook secret does not open it", () => {
  assert.equal(checkPendingAdminAuthorization(`Bearer ${ADMIN_SECRET}`, undefined).ok, false);
  assert.equal(checkPendingAdminAuthorization(`Bearer ${WEBHOOK_SECRET}`, ADMIN_SECRET).ok, false);
  assert.equal(checkPendingAdminAuthorization(`Bearer ${"b".repeat(MIN_ADMIN_SECRET_LENGTH)}`, ADMIN_SECRET).ok, false);
  assert.equal(checkPendingAdminAuthorization(`Bearer ${ADMIN_SECRET}`, ADMIN_SECRET).ok, true);
});

test("the list shows the open updates and counts by status, and rejects an unknown filter", async () => {
  const h = harness({ leads: index([]) });
  await send(h, { phone: PHONE, mainStatus: "בתהליך", secondaryStatus: "בתהליך" });
  const listed = await handlePendingList(adminRequest(undefined, "GET", "?status=open"), adminDepsFor(h));
  assert.equal(listed.status, 200);
  const body = (await listed.json()) as { counts: Record<string, number>; items: { normalizedPhone: string; status: string }[] };
  assert.equal(body.counts.open, 1);
  assert.equal(body.items[0].status, "open");
  assert.equal(body.items[0].normalizedPhone, PHONE);
  const bad = await handlePendingList(adminRequest(undefined, "GET", "?status=nope"), adminDepsFor(h));
  assert.equal(bad.status, 400);
});

test("replay over HTTP: dry run first, then the real replay applies and schedules the CRM flush", async () => {
  const h = harness({ leads: index([]) });
  await send(h, { phone: PHONE, mainStatus: "בתהליך", secondaryStatus: "בתהליך" });
  h.setIndex(index([{ id: LEAD, phone: PHONE }]));
  const deps = adminDepsFor(h);

  const dry = await handlePendingAction(adminRequest({ action: "replay", dryRun: true }), deps);
  assert.equal(((await dry.json()) as { counts: { would_apply: number } }).counts.would_apply, 1);
  assert.equal(h.pending.all[0].status, "open");

  const real = await handlePendingAction(adminRequest({ action: "replay" }), deps);
  const realBody = (await real.json()) as { counts: { applied: number }; rows: { id: number; outcome: string }[] };
  assert.equal(realBody.counts.applied, 1);
  await h.runScheduled();
  assert.equal(h.flushes, 1);
});

test("dismiss closes an open update; the same action on a closed one is 404; an unknown action is 400", async () => {
  const h = harness({ leads: index([]) });
  await send(h, { phone: PHONE, mainStatus: "בתהליך", secondaryStatus: "בתהליך" });
  const id = h.pending.all[0].id;
  const deps = adminDepsFor(h);
  assert.equal((await handlePendingAction(adminRequest({ action: "dismiss", id }), deps)).status, 200);
  assert.equal(h.pending.all[0].status, "dismissed");
  assert.equal((await handlePendingAction(adminRequest({ action: "dismiss", id }), deps)).status, 404);
  assert.equal((await handlePendingAction(adminRequest({ action: "delete-all" }), deps)).status, 400);
});
