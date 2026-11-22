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
  type PendingReason,
  type PendingRow,
  type PendingStatus,
  type PendingStore,
} from "@/lib/lead-status/pending-core";
import { replayPendingRows, type ReplayCrmPreview } from "@/lib/lead-status/pending-replay";
import { runLeadStatusWebhook, type LeadStatusWebhookDeps } from "@/lib/lead-status/webhook-handler";
import {
  ADMIN_SECRET_ENV,
  checkPendingAdminAuthorization,
  handlePendingAction,
  handlePendingList,
  MIN_ADMIN_SECRET_LENGTH,
  type PendingAdminDeps,
} from "@/lib/lead-status/pending-admin-handler";
import type { CrmEventType } from "@/lib/crm-capi/rules";

const T0 = new Date("2026-11-20T10:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const at = (minutes: number): Date => new Date(T0.getTime() + minutes * 60 * 1000);

const WEBHOOK_SECRET = "webhook-test-secret-not-real";
const ADMIN_SECRET = "a".repeat(MIN_ADMIN_SECRET_LENGTH);
const LEAD = "120210000000001111";
const OTHER_LEAD = "120210000000002222";
const PHONE = "0528678178";
/** Meta Lead IDs are 15 to 17 digits. The CRM tests use IDs of that length, so the event builder accepts them. */
const META_A = "1202100000000111";
const META_B = "1202100000000222";
const META_D = "1202100000000444";
const META_E = "1202100000000555";
/** The "no status write yet" sentinel a rating-only row gets (see repository.ts). */
const NEVER = "1970-01-01T00:00:00.000Z";

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
    patch: {
      mainStatus: string;
      secondaryStatus: string;
      normalizedPhone?: string | null;
      fullPaymentAmount?: number | null;
      partialPaymentAmount?: number | null;
      studentRating?: StudentRating | null;
      sourceAt?: Date | null;
    }
  ): Promise<LeadStatusRecord> {
    const existing = this.rows.get(leadId);
    const when = (patch.sourceAt ?? this.clock.now).toISOString();
    const record: LeadStatusRecord = {
      leadId,
      normalizedPhone: patch.normalizedPhone ?? existing?.normalizedPhone ?? null,
      mainStatus: patch.mainStatus as MainStatus,
      secondaryStatus: patch.secondaryStatus,
      fullPaymentAmount: patch.fullPaymentAmount ?? null,
      partialPaymentAmount: patch.partialPaymentAmount ?? null,
      studentRating: patch.studentRating === undefined ? (existing?.studentRating ?? null) : patch.studentRating,
      statusAt: when,
      studentRatingAt: patch.studentRating === undefined ? (existing?.studentRatingAt ?? null) : when,
      updatedAt: this.clock.now.toISOString(),
    };
    this.rows.set(leadId, record);
    this.writes.push(leadId);
    return record;
  }

  async upsertStudentRating(leadId: string, studentRating: StudentRating | null, normalizedPhone?: string | null, sourceAt?: Date | null) {
    const existing = this.rows.get(leadId);
    const previousStudentRating = (existing?.studentRating ?? null) as StudentRating | null;
    const when = (sourceAt ?? this.clock.now).toISOString();
    const record: LeadStatusRecord = existing
      ? {
          ...existing,
          studentRating,
          normalizedPhone: normalizedPhone ?? existing.normalizedPhone,
          studentRatingAt: when,
          updatedAt: this.clock.now.toISOString(),
        }
      : {
          leadId,
          normalizedPhone: normalizedPhone ?? null,
          mainStatus: "חדש" as MainStatus,
          secondaryStatus: "חדש",
          fullPaymentAmount: null,
          partialPaymentAmount: null,
          studentRating,
          statusAt: NEVER,
          studentRatingAt: when,
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
  /** A test sets this to make another completion run hold the lock. */
  runHeld = false;
  private holder: string | null = null;
  constructor(private readonly clock: Clock) {}

  get all(): PendingRow[] {
    return this.entries.map((entry) => entry.row);
  }

  async insert(input: NewPendingUpdate) {
    const open = this.entries.find((entry) => entry.row.status === "open" && entry.dedupeKey === input.dedupeKey);
    if (open) {
      open.row.receivedCount += 1;
      open.row.lastReceivedAt = this.clock.now;
      open.row.sourceAt = open.row.sourceAt.getTime() > input.sourceAt.getTime() ? open.row.sourceAt : input.sourceAt;
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
      sourceAt: input.sourceAt,
      firstReceivedAt: this.clock.now,
      lastReceivedAt: this.clock.now,
      receivedCount: 1,
      attempts: 0,
      lastCheckedAt: this.clock.now,
      lastError: null,
      resolvedLeadId: null,
      resolvedAt: null,
    };
    this.entries.push({ row, dedupeKey: input.dedupeKey });
    return { id: row.id, inserted: true };
  }

  private bySource(rows: PendingRow[]): PendingRow[] {
    return [...rows].sort((a, b) => a.sourceAt.getTime() - b.sourceAt.getTime() || a.id - b.id);
  }

  async listOpen(limit: number): Promise<PendingRow[]> {
    return this.bySource(this.all.filter((row) => row.status === "open")).slice(0, limit);
  }

  async listRetryable(limit: number): Promise<PendingRow[]> {
    const due = this.all.filter(
      (row) => row.status === "open" && (row.lastCheckedAt === null || row.lastCheckedAt.getTime() < this.clock.now.getTime() - 10 * 60 * 1000)
    );
    return this.bySource(due).slice(0, limit);
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

  async tryAcquireRun(holder: string): Promise<boolean> {
    if (this.runHeld || this.holder !== null) return false;
    this.holder = holder;
    return true;
  }

  async releaseRun(holder: string): Promise<void> {
    if (this.holder === holder) this.holder = null;
  }

  async openSummary(): Promise<{ reason: PendingReason; count: number; oldestSourceAt: Date }[]> {
    const groups = new Map<PendingReason, { count: number; oldestSourceAt: Date }>();
    for (const row of this.all) {
      if (row.status !== "open") continue;
      const group = groups.get(row.reason);
      if (!group) groups.set(row.reason, { count: 1, oldestSourceAt: row.sourceAt });
      else {
        group.count += 1;
        if (row.sourceAt.getTime() < group.oldestSourceAt.getTime()) group.oldestSourceAt = row.sourceAt;
      }
    }
    return [...groups.entries()].map(([reason, group]) => ({ reason, ...group }));
  }
}

function index(leads: { id: string; phone: string | null }[], metaAvailable = true): DashboardLeadIndex {
  return {
    metaAvailable,
    byId: new Map(leads.map((lead) => [lead.id, { id: lead.id, name: null, phone: null, normalizedPhone: lead.phone, createdDate: "2026-11-01" }])),
  };
}

function harness(initial: { leads: DashboardLeadIndex; statuses?: LeadStatusRecord[]; autoComplete?: boolean }) {
  const clock = new Clock();
  const store = new FakeStatusStore(clock);
  for (const row of initial.statuses ?? []) store.rows.set(row.leadId, row);
  const pending = new FakePendingStore(clock);
  const crmChanges: CrmChangeInput[] = [];
  const queued = new Set<string>();
  const crm = {
    sendEnabled: true,
    isQueued: async (leadKey: string, eventType: CrmEventType) => queued.has(`${leadKey}|${eventType}`),
  };
  const logs: string[] = [];
  let flushes = 0;
  let scheduled: (() => Promise<void>)[] = [];
  let currentIndex = initial.leads;
  const deps: LeadStatusWebhookDeps = {
    env: {
      LEAD_STATUS_WEBHOOK_SECRET: WEBHOOK_SECRET,
      LEAD_STATUS_AUTO_COMPLETE: initial.autoComplete === false ? "off" : "on",
    },
    now: () => clock.now,
    loadIndex: async () => currentIndex,
    store,
    pending,
    recordCrm: async (change) => {
      crmChanges.push(change);
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
    queued,
    crmChanges,
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

type Harness = ReturnType<typeof harness>;

function webhookRequest(body: unknown): Request {
  return new Request("https://example.test/api/webhooks/lead-status", {
    method: "POST",
    headers: { authorization: `Bearer ${WEBHOOK_SECRET}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function send(h: Harness, body: unknown): Promise<{ status: number; json: Record<string, unknown>; text: string }> {
  const response = await runLeadStatusWebhook(webhookRequest(body), h.deps);
  const text = await response.text();
  return { status: response.status, json: JSON.parse(text) as Record<string, unknown>, text };
}

function adminDepsFor(h: Harness): PendingAdminDeps {
  const crm: ReplayCrmPreview = h.crm;
  return {
    env: { ...h.deps.env, [ADMIN_SECRET_ENV]: ADMIN_SECRET },
    now: () => h.clock.now,
    loadIndex: async () => h.deps.loadIndex(),
    store: h.store,
    pending: h.pending,
    recordCrm: h.deps.recordCrm,
    schedule: h.deps.schedule,
    flush: h.deps.flush,
    crm,
  };
}

function adminRequest(body: unknown, method = "POST", query = ""): Request {
  return new Request(`https://example.test/api/admin/lead-status/pending${query}`, {
    method,
    headers: { authorization: `Bearer ${ADMIN_SECRET}`, "content-type": "application/json" },
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });
}

const OPEN_STATUS = { mainStatus: "בתהליך", secondaryStatus: "בתהליך" };

// ---------- pure helpers ----------

test("the dedupe key is the same for the same update, however its keys are ordered, and differs for a different one", () => {
  const a = pendingDedupeKey({ leadIdHint: null, normalizedPhone: PHONE, kind: "status", payload: { mainStatus: "בתהליך", secondaryStatus: "בתהליך" } });
  const b = pendingDedupeKey({
    leadIdHint: null,
    normalizedPhone: PHONE,
    kind: "status",
    payload: { secondaryStatus: "בתהליך", mainStatus: "בתהליך", fullPaymentAmount: undefined },
  });
  const c = pendingDedupeKey({ leadIdHint: null, normalizedPhone: PHONE, kind: "status", payload: { mainStatus: "אין מענה", secondaryStatus: 'א"מ - יום 1' } });
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test("a missing field and an explicit null are different updates: null clears, absence keeps", () => {
  const missing = pendingDedupeKey({ leadIdHint: LEAD, normalizedPhone: null, kind: "rating", payload: {} });
  const cleared = pendingDedupeKey({ leadIdHint: LEAD, normalizedPhone: null, kind: "rating", payload: { studentRating: null } });
  assert.notEqual(missing, cleared);
});

test("superseded: a write at or after the update's source time; an earlier write does not supersede", () => {
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
  const result = await send(h, { phone: "0528678179", ...OPEN_STATUS });
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
  assert.equal((await send(h, { phone: "אבא", ...OPEN_STATUS })).json.reason, "not_found");
  assert.equal((await send(h, { phone: "12345", ...OPEN_STATUS })).json.reason, "invalid_phone");
  assert.equal(h.pending.all.length, 2);
});

test("an ambiguous phone (two leads) is kept, never guessed", async () => {
  const h = harness({ leads: index([{ id: LEAD, phone: PHONE }, { id: OTHER_LEAD, phone: PHONE }]) });
  const result = await send(h, { phone: PHONE, ...OPEN_STATUS });
  assert.equal(result.status, 200);
  assert.equal(result.json.reason, "ambiguous");
  assert.equal(h.store.writes.length, 0);
});

test("a request with neither leadId nor phone is kept as missing_identity, not refused", async () => {
  const h = harness({ leads: index([{ id: LEAD, phone: PHONE }]) });
  const result = await send(h, { ...OPEN_STATUS });
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
  const result = await send(h, { leadId: LEAD, ...OPEN_STATUS });
  assert.equal(result.status, 200);
  assert.equal(result.json.applied, true);
  assert.equal(h.store.rows.get(LEAD)?.mainStatus, "בתהליך");
  assert.equal(h.crmChanges.length, 1);
  await h.runScheduled();
  assert.equal(h.flushes, 1);
});

test("a phone found only under another question is held as unverified: no write, and the reply says why", async () => {
  const entry = { id: LEAD, name: null, phone: null, normalizedPhone: null, matchPhone: PHONE, createdDate: "2026-11-01" };
  const h = harness({ leads: { metaAvailable: true, byId: new Map([[LEAD, entry]]) } });
  const result = await send(h, { phone: PHONE, pcfsystemfield350: 9 });
  assert.equal(result.status, 200);
  assert.equal(result.json.applied, false);
  assert.equal(result.json.reason, "unverified_match");
  assert.equal(h.store.writes.length, 0);
  assert.equal(entry.normalizedPhone, null, "the display field is untouched");
});

test("a lead with a standard phone question and a custom phone-shaped answer is matched by the standard one", async () => {
  const entry = { id: LEAD, name: null, phone: PHONE, normalizedPhone: PHONE, matchPhone: PHONE, createdDate: "2026-11-01" };
  const h = harness({ leads: { metaAvailable: true, byId: new Map([[LEAD, entry]]) } });
  const result = await send(h, { phone: PHONE, pcfsystemfield350: 9 });
  assert.equal(result.json.applied, true);
  assert.equal(result.json.matchedBy, "phone");
});

// ---------- webhook: real failures and the durable queue ----------

test("when the Meta list is unavailable the update is kept in the queue: 200, applied false, retryLater", async () => {
  const h = harness({ leads: index([], false) });
  const result = await send(h, { phone: PHONE, ...OPEN_STATUS });
  assert.equal(result.status, 200);
  assert.equal(result.json.applied, false);
  assert.equal(result.json.reason, "meta_unavailable");
  assert.equal(result.json.retryLater, true);
  assert.equal(result.json.recorded, true);
  assert.equal(h.pending.all[0].reason, "meta_unavailable");
  assert.equal(h.store.writes.length, 0);
});

test("a database failure while saving the update is a 503: the update is not reported as kept", async () => {
  const h = harness({ leads: index([]) });
  // Inherits every other method of the fake; only the insert fails.
  const failing: PendingStore = Object.create(h.pending);
  failing.insert = async () => {
    const error = new Error("שגיאה בשמירת העדכון הממתין במסד הנתונים. העדכון לא נשמר.");
    error.name = "LeadStatusDatabaseError";
    throw error;
  };
  h.deps.pending = failing;
  const result = await send(h, { leadId: LEAD, ...OPEN_STATUS });
  assert.equal(result.status, 503);
  assert.match((result.json.error as { message: string }).message, /שגיאה בשמירת/);
});

test("an unexpected failure is a 500 and the raw message never reaches the reply", async () => {
  const h = harness({ leads: index([]) });
  h.deps.loadIndex = async () => {
    throw new Error("internal detail that must not leak");
  };
  const result = await send(h, { leadId: LEAD, ...OPEN_STATUS });
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

test("credentials keep their codes: no token 401, and an unconfigured endpoint 503", async () => {
  const h = harness({ leads: index([]) });
  const noAuth = await runLeadStatusWebhook(new Request("https://example.test/x", { method: "POST", body: "{}" }), h.deps);
  assert.equal(noAuth.status, 401);
  const unconfigured = await runLeadStatusWebhook(webhookRequest({ leadId: LEAD }), { ...h.deps, env: {} });
  assert.equal(unconfigured.status, 503);
  assert.equal(h.pending.all.length, 0);
});

// ---------- retry: after a webhook, and the completion job ----------

test("with LEAD_STATUS_AUTO_COMPLETE off, a later webhook does not apply the pending update by itself", async () => {
  const h = harness({ leads: index([]), autoComplete: false });
  await send(h, { phone: PHONE, pcfsystemfield350: 9 });
  h.setIndex(index([{ id: LEAD, phone: PHONE }]));
  h.clock.now = at(60);
  await send(h, { phone: "0501111111", pcfsystemfield350: 6 });
  await h.runScheduled();
  assert.equal(h.store.rows.get(LEAD), undefined, "nothing written");
  assert.equal(h.pending.all.find((row) => row.normalizedPhone === PHONE)?.status, "open");
});

test("a pending rating is applied by a later webhook once its lead is known and its last check is old enough", async () => {
  const h = harness({ leads: index([]) });
  await send(h, { phone: PHONE, pcfsystemfield350: 9 });
  h.setIndex(index([{ id: LEAD, phone: PHONE }]));
  await send(h, { phone: "0501111111", pcfsystemfield350: 6 });
  await h.runScheduled();
  assert.equal(h.store.rows.get(LEAD), undefined, "not yet due");
  h.clock.now = at(11);
  await send(h, { phone: "0502222222", pcfsystemfield350: 6 });
  await h.runScheduled();
  assert.equal(h.store.rows.get(LEAD)?.studentRating, 4, "due after the interval");
});

test("the completion job only reports while LEAD_STATUS_AUTO_COMPLETE is off, and applies once it is on", async () => {
  const off = harness({ leads: index([]), autoComplete: false });
  await send(off, { phone: PHONE, ...OPEN_STATUS });
  off.setIndex(index([{ id: LEAD, phone: PHONE }]));
  const dry = await handlePendingAction(adminRequest({ action: "auto" }), adminDepsFor(off));
  const dryBody = (await dry.json()) as { mode: string; reason: string; counts: Record<string, number> };
  assert.equal(dry.status, 200);
  assert.equal(dryBody.mode, "dry_run");
  assert.equal(dryBody.reason, "auto_complete_off");
  assert.equal(dryBody.counts.would_apply, 1);
  assert.equal(off.pending.all[0].status, "open");
  assert.equal(off.store.writes.length, 0);

  const on = harness({ leads: index([]), autoComplete: true });
  await send(on, { phone: PHONE, ...OPEN_STATUS });
  on.setIndex(index([{ id: LEAD, phone: PHONE }]));
  on.clock.now = at(60);
  const real = await handlePendingAction(adminRequest({ action: "auto" }), adminDepsFor(on));
  const realBody = (await real.json()) as { mode: string; counts: Record<string, number> };
  assert.equal(realBody.mode, "applied");
  assert.equal(realBody.counts.applied, 1);
  assert.equal(on.store.rows.get(LEAD)?.mainStatus, "בתהליך");
});

test("the completion job answers 503 while Meta is unavailable, so a failed run is visible", async () => {
  const h = harness({ leads: index([], false) });
  const result = await handlePendingAction(adminRequest({ action: "auto" }), adminDepsFor(h));
  assert.equal(result.status, 503);
});

// ---------- one completion run at a time ----------

test("while another completion run holds the lock, a replay answers 409 and changes nothing", async () => {
  const h = harness({ leads: index([]) });
  await send(h, { phone: PHONE, ...OPEN_STATUS });
  h.setIndex(index([{ id: LEAD, phone: PHONE }]));
  h.pending.runHeld = true;
  const busy = await handlePendingAction(adminRequest({ action: "replay" }), adminDepsFor(h));
  assert.equal(busy.status, 409);
  assert.equal(h.pending.all[0].status, "open");
  assert.equal(h.store.writes.length, 0);
  h.pending.runHeld = false;
  const free = await handlePendingAction(adminRequest({ action: "replay" }), adminDepsFor(h));
  assert.equal(free.status, 200);
  assert.equal(h.pending.all[0].status, "applied");
});

test("the completion job reports skipped_busy instead of waiting when another run is active", async () => {
  const h = harness({ leads: index([]), autoComplete: true });
  await send(h, { phone: PHONE, ...OPEN_STATUS });
  h.setIndex(index([{ id: LEAD, phone: PHONE }]));
  h.clock.now = at(60);
  h.pending.runHeld = true;
  const reply = await handlePendingAction(adminRequest({ action: "auto" }), adminDepsFor(h));
  assert.equal(((await reply.json()) as { mode: string }).mode, "skipped_busy");
  assert.equal(h.pending.all[0].status, "open");
});

// ---------- ambiguous phone: the admin chooses, with the candidates in view ----------

test("an ambiguous update lists the leads that share its phone, by ID and status only, and nothing is chosen for the admin", async () => {
  const h = harness({ leads: index([{ id: LEAD, phone: PHONE }, { id: OTHER_LEAD, phone: PHONE }]) });
  await send(h, { phone: PHONE, pcfsystemfield350: 8 });
  const id = h.pending.all[0].id;
  const listed = await handlePendingList(adminRequest(undefined, "GET", `?id=${id}&candidates=1`), adminDepsFor(h));
  assert.equal(listed.status, 200);
  const body = (await listed.json()) as { candidates: { leadId: string; matchKind: string; name?: unknown; phone?: unknown }[]; note: string };
  assert.deepEqual([...body.candidates.map((c) => c.leadId)].sort(), [LEAD, OTHER_LEAD].sort());
  assert.ok(body.candidates.every((c) => c.matchKind === "standard_phone"));
  assert.ok(body.candidates.every((c) => c.name === undefined && c.phone === undefined), "no names and no phone numbers in the candidates");
  assert.equal(h.pending.all[0].status, "open", "nothing was applied by listing");
  const missing = await handlePendingList(adminRequest(undefined, "GET", "?id=999&candidates=1"), adminDepsFor(h));
  assert.equal(missing.status, 404);
});

// ---------- the dry run shows what would reach Meta ----------

test("a dry run says what each row would queue for Meta, and writes nothing", async () => {
  const h = harness({ leads: index([]) });
  // A rating of 4 or 5 qualifies a lead. Four pending ratings, each with its own phone.
  await send(h, { phone: "0521000001", pcfsystemfield350: 9 }); // META_A: 4 flames, would queue "qualified"
  await send(h, { phone: "0521000002", pcfsystemfield350: 10 }); // META_B: 5 flames, but "qualified" is already queued
  await send(h, { phone: "0521000004", pcfsystemfield350: 6 }); // META_D: 1 flame, no event at all
  h.clock.now = new Date(T0.getTime() - 10 * DAY_MS);
  await send(h, { phone: "0521000005", pcfsystemfield350: 9 }); // META_E: received 10 days ago, too old for Meta
  h.clock.now = T0;
  h.setIndex(
    index([
      { id: META_A, phone: "0521000001" },
      { id: META_B, phone: "0521000002" },
      { id: META_D, phone: "0521000004" },
      { id: META_E, phone: "0521000005" },
    ])
  );
  h.queued.add(`${META_B}|qualified`);
  const before = JSON.stringify([...h.store.rows.values()]) + JSON.stringify(h.pending.all) + JSON.stringify([...h.queued]);
  const dry = await handlePendingAction(adminRequest({ action: "replay", dryRun: true }), adminDepsFor(h));
  const body = (await dry.json()) as { rows: { leadId?: string; outcome: string; crm?: { eventType: string; action: string }[] }[] };
  const byLead = new Map(body.rows.map((row) => [row.leadId, row]));
  assert.equal(byLead.get(META_A)?.crm?.[0]?.action, "queue");
  assert.equal(byLead.get(META_A)?.crm?.[0]?.eventType, "qualified");
  assert.equal(byLead.get(META_B)?.crm?.[0]?.action, "already_queued");
  assert.equal(byLead.get(META_D)?.crm?.length, 0, "a 1-flame rating queues no event");
  assert.equal(byLead.get(META_E)?.crm?.[0]?.action, "skip_too_old");
  const after = JSON.stringify([...h.store.rows.values()]) + JSON.stringify(h.pending.all) + JSON.stringify([...h.queued]);
  assert.equal(after, before, "the dry run changed nothing: no lead, no pending row, no outbox row");
  assert.equal(h.crmChanges.length, 0, "no CRM change was recorded");

  h.crm.sendEnabled = false;
  const off = await handlePendingAction(adminRequest({ action: "replay", dryRun: true }), adminDepsFor(h));
  const offBody = (await off.json()) as { rows: { leadId?: string; crm?: { action: string }[] }[] };
  assert.equal(offBody.rows.find((row) => row.leadId === META_A)?.crm?.[0]?.action, "skip_sending_off", "with sending off nothing is queued");
});

test("an imported rating is previewed as not queued for Meta, because its change time is not known", async () => {
  const h = harness({ leads: index([{ id: META_A, phone: "0521000001" }]) });
  const exported = at(-30).toISOString();
  const dry = await handlePendingAction(
    adminRequest({ action: "import", dryRun: true, exportedAt: exported, rows: [{ leadId: META_A, pcfsystemfield350: 9 }] }),
    adminDepsFor(h)
  );
  const body = (await dry.json()) as { preview: { rows: { crm?: { action: string }[] }[] } };
  assert.equal(body.preview.rows[0].crm?.[0]?.action, "skip_no_reliable_date");
});

// ---------- a status and a rating together: each field group is judged on its own ----------

test("a pending update with a status and a rating keeps its rating when a newer status write superseded its status", async () => {
  const h = harness({ leads: index([]) });
  await send(h, { phone: PHONE, mainStatus: "אין מענה", secondaryStatus: 'א"מ - יום 1', pcfsystemfield350: 9 });
  h.clock.now = at(30);
  h.store.rows.set(LEAD, {
    leadId: LEAD,
    normalizedPhone: PHONE,
    mainStatus: "בתהליך" as MainStatus,
    secondaryStatus: "בתהליך",
    fullPaymentAmount: null,
    partialPaymentAmount: null,
    studentRating: null,
    statusAt: at(30).toISOString(),
    studentRatingAt: null,
    updatedAt: at(30).toISOString(),
  });
  h.setIndex(index([{ id: LEAD, phone: PHONE }]));
  const report = await replayPendingRows(await h.pending.listOpen(50), {
    index: h.deps.loadIndex ? await h.deps.loadIndex() : index([]),
    store: h.store,
    pending: h.pending,
    recordCrm: h.deps.recordCrm,
    now: h.clock.now,
    dryRun: false,
  });
  assert.equal(report.counts.applied, 1);
  assert.equal(report.rows[0].note, "status_superseded");
  assert.equal(h.store.rows.get(LEAD)?.mainStatus, "בתהליך", "the newer status stays");
  assert.equal(h.store.rows.get(LEAD)?.studentRating, 4, "the rating still reaches the lead");
});

// ---------- replay: completing what was missed ----------

test("a pending update is applied once its lead exists, with the receipt time as the CRM change time", async () => {
  const h = harness({ leads: index([]) });
  await send(h, { phone: PHONE, ...OPEN_STATUS });
  const received = h.pending.all[0].lastReceivedAt;
  h.clock.now = at(60);
  const report = await replayPendingRows(await h.pending.listOpen(50), {
    index: index([{ id: LEAD, phone: PHONE }]),
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
  assert.equal(h.crmChanges[0].statusChangedAt?.getTime(), received.getTime());
});

test("an update superseded by a newer write to its lead is never applied over it", async () => {
  const h = harness({ leads: index([]) });
  await send(h, { phone: PHONE, mainStatus: "אין מענה", secondaryStatus: 'א"מ - יום 1' });
  h.clock.now = at(30);
  h.store.rows.set(LEAD, {
    leadId: LEAD,
    normalizedPhone: PHONE,
    mainStatus: "בתהליך" as MainStatus,
    secondaryStatus: "בתהליך",
    fullPaymentAmount: null,
    partialPaymentAmount: null,
    studentRating: null,
    updatedAt: at(30).toISOString(),
  });
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

test("two pending status updates for one lead apply oldest first, so the newest stays in force", async () => {
  const h = harness({ leads: index([]) });
  await send(h, { phone: PHONE, mainStatus: "אין מענה", secondaryStatus: 'א"מ - יום 1' });
  h.clock.now = at(5);
  await send(h, { phone: PHONE, ...OPEN_STATUS });
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
  await send(h, { phone: PHONE, ...OPEN_STATUS });
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
  await send(h, { phone: PHONE, ...OPEN_STATUS });
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
  assert.equal(h.crmChanges.length, 0);
  assert.equal(h.pending.all[0].status, "open");
});

test("with the Meta list unavailable the replay writes nothing and says why for each row", async () => {
  const h = harness({ leads: index([]) });
  await send(h, { phone: PHONE, ...OPEN_STATUS });
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

test("a pending rating is not superseded by a later STATUS change: the rating still reaches the lead", async () => {
  const h = harness({ leads: index([]) });
  await send(h, { phone: PHONE, pcfsystemfield350: 9 });
  h.clock.now = at(30);
  h.store.rows.set(LEAD, {
    leadId: LEAD,
    normalizedPhone: PHONE,
    mainStatus: "בתהליך" as MainStatus,
    secondaryStatus: "בתהליך",
    fullPaymentAmount: null,
    partialPaymentAmount: null,
    studentRating: null,
    updatedAt: at(30).toISOString(),
  });
  const report = await replayPendingRows(await h.pending.listOpen(50), {
    index: index([{ id: LEAD, phone: PHONE }]),
    store: h.store,
    pending: h.pending,
    recordCrm: h.deps.recordCrm,
    now: at(60),
    dryRun: false,
  });
  assert.equal(report.counts.applied, 1, JSON.stringify(report.counts));
  assert.equal(h.store.rows.get(LEAD)?.studentRating, 4);
});

test("a pending rating is superseded by a newer rating written live: the older value is not applied over it", async () => {
  const h = harness({ leads: index([]) });
  await send(h, { phone: PHONE, pcfsystemfield350: 6 });
  h.clock.now = at(30);
  h.setIndex(index([{ id: LEAD, phone: PHONE }]));
  await send(h, { leadId: LEAD, pcfsystemfield350: 10 });
  const report = await replayPendingRows(await h.pending.listOpen(50), {
    index: index([{ id: LEAD, phone: PHONE }]),
    store: h.store,
    pending: h.pending,
    recordCrm: h.deps.recordCrm,
    now: at(60),
    dryRun: false,
  });
  assert.equal(report.counts.superseded, 1);
  assert.equal(h.store.rows.get(LEAD)?.studentRating, 5);
});

test("the story end to end: a rating arrives before its lead, the rep changes the status, the lead appears hours later, and a retry applies the rating", async () => {
  const h = harness({ leads: index([]) });
  await send(h, { phone: PHONE, pcfsystemfield350: 9 }); // T0: the customer answers WhatsApp; lead not in the dashboard yet
  h.clock.now = at(60);
  await h.store.upsert(LEAD, { mainStatus: "אין מענה", secondaryStatus: 'א"מ - יום 1', normalizedPhone: PHONE }); // T+1h: the rep changes the status
  h.clock.now = at(180);
  h.setIndex(index([{ id: LEAD, phone: PHONE }])); // T+3h: the lead is in the dashboard
  await send(h, { phone: "0501111111", pcfsystemfield350: 6 }); // a later Fireberry update triggers the background retry
  await h.runScheduled();
  assert.equal(h.store.rows.get(LEAD)?.studentRating, 4, "the rating reached the lead");
  assert.equal(h.store.rows.get(LEAD)?.mainStatus, "אין מענה", "the status is unchanged by the retry");
  assert.equal(h.pending.all.find((row) => row.normalizedPhone === PHONE)?.status, "applied");
});

// ---------- two leads, one phone: nothing is guessed ----------

test("two leads with the same phone: the rating is held, not guessed; applying it to the chosen lead touches only that lead", async () => {
  const h = harness({ leads: index([{ id: LEAD, phone: PHONE }, { id: OTHER_LEAD, phone: PHONE }]) });
  const result = await send(h, { phone: PHONE, pcfsystemfield350: 8 });
  assert.equal(result.json.reason, "ambiguous");
  assert.equal(h.store.writes.length, 0);
  const id = h.pending.all[0].id;
  const applied = await handlePendingAction(adminRequest({ action: "apply", id, leadId: OTHER_LEAD }), adminDepsFor(h));
  assert.equal(applied.status, 200);
  assert.equal(h.store.rows.get(OTHER_LEAD)?.studentRating, 3);
  assert.equal(h.store.rows.get(LEAD), undefined);
});

test("a rating held as unverified is applied only when an admin chooses the lead", async () => {
  const entry = { id: LEAD, name: null, phone: null, normalizedPhone: null, matchPhone: PHONE, createdDate: "2026-11-01" };
  const h = harness({ leads: { metaAvailable: true, byId: new Map([[LEAD, entry]]) } });
  await send(h, { phone: PHONE, pcfsystemfield350: 9 });
  assert.equal(h.store.writes.length, 0);
  const id = h.pending.all[0].id;
  const applied = await handlePendingAction(adminRequest({ action: "apply", id, leadId: LEAD }), adminDepsFor(h));
  assert.equal(applied.status, 200);
  assert.equal(h.store.rows.get(LEAD)?.studentRating, 4);
});

// ---------- import from Fireberry: one export time for the whole file ----------

test("an import needs an export time, refuses a time on a row, and reports a live rating written after the export as superseded", async () => {
  const h = harness({ leads: index([{ id: LEAD, phone: PHONE }, { id: OTHER_LEAD, phone: "0504444444" }]) });
  const deps = adminDepsFor(h);
  const noTime = await handlePendingAction(adminRequest({ action: "import", rows: [{ leadId: LEAD, pcfsystemfield350: 9 }] }), deps);
  assert.equal(noTime.status, 400);

  h.clock.now = at(30);
  await send(h, { leadId: LEAD, pcfsystemfield350: 6 }); // a live rating for LEAD at T30, after the export
  const exported = at(10).toISOString();
  const rows = [
    { leadId: LEAD, pcfsystemfield350: 9 },
    { leadId: OTHER_LEAD, pcfsystemfield350: 10 },
    { leadId: OTHER_LEAD, pcfsystemfield350: 8, changedAt: exported },
  ];
  const dry = await handlePendingAction(adminRequest({ action: "import", dryRun: true, exportedAt: exported, rows }), deps);
  const dryBody = (await dry.json()) as {
    valid: number;
    invalid: { index: number }[];
    preview: { counts: Record<string, number> };
  };
  assert.equal(dryBody.valid, 2);
  assert.deepEqual(
    dryBody.invalid.map((item) => item.index),
    [2]
  );
  assert.equal(dryBody.preview.counts.superseded, 1, "LEAD: the live rating (T30) is newer than the export (T10)");
  assert.equal(dryBody.preview.counts.would_apply, 1, "OTHER_LEAD: nothing newer is stored");
  assert.equal(h.pending.all.length, 0, "a dry run stores nothing");

  const real = await handlePendingAction(adminRequest({ action: "import", exportedAt: exported, rows }), deps);
  const realBody = (await real.json()) as { stored: number; invalid: unknown[] };
  assert.equal(realBody.stored, 2);
  assert.equal(realBody.invalid.length, 1);
  assert.ok(h.pending.all.every((row) => row.reason === "imported" && row.sourceAt.toISOString() === exported));
});

// ---------- admin endpoint ----------

test("the admin endpoint is refused without its own secret, and a webhook secret does not open it", () => {
  assert.equal(checkPendingAdminAuthorization(`Bearer ${ADMIN_SECRET}`, undefined).ok, false);
  assert.equal(checkPendingAdminAuthorization(`Bearer ${WEBHOOK_SECRET}`, ADMIN_SECRET).ok, false);
  assert.equal(checkPendingAdminAuthorization(`Bearer ${"b".repeat(MIN_ADMIN_SECRET_LENGTH)}`, ADMIN_SECRET).ok, false);
  assert.equal(checkPendingAdminAuthorization(`Bearer ${ADMIN_SECRET}`, ADMIN_SECRET).ok, true);
});

test("the list shows the open updates with their source time, phone and counts, and rejects an unknown filter", async () => {
  const h = harness({ leads: index([]) });
  await send(h, { phone: PHONE, ...OPEN_STATUS });
  const listed = await handlePendingList(adminRequest(undefined, "GET", "?status=open"), adminDepsFor(h));
  assert.equal(listed.status, 200);
  const body = (await listed.json()) as { counts: Record<string, number>; items: { status: string; normalizedPhone: string; sourceAt: string }[] };
  assert.equal(body.counts.open, 1);
  assert.equal(body.items[0].normalizedPhone, PHONE);
  assert.ok(body.items[0].sourceAt);
  const bad = await handlePendingList(adminRequest(undefined, "GET", "?status=nope"), adminDepsFor(h));
  assert.equal(bad.status, 400);
});

test("the diagnostics reply counts the open updates by reason, with the oldest receipt time of each", async () => {
  const h = harness({ leads: index([]) });
  await send(h, { phone: PHONE, ...OPEN_STATUS });
  await send(h, { phone: "0503333333", pcfsystemfield350: 9 });
  const listed = await handlePendingList(adminRequest(undefined, "GET", "?status=open&diagnostics=1"), adminDepsFor(h));
  const body = (await listed.json()) as { open: { reason: string; count: number; oldestSourceAt: Date | string }[] };
  assert.equal(body.open.length, 1);
  assert.equal(body.open[0].reason, "not_found");
  assert.equal(body.open[0].count, 2);
  assert.equal(new Date(body.open[0].oldestSourceAt).toISOString(), T0.toISOString());
});

test("replay over HTTP: dry run first, then the real replay applies and schedules the CRM flush", async () => {
  const h = harness({ leads: index([]) });
  await send(h, { phone: PHONE, ...OPEN_STATUS });
  h.setIndex(index([{ id: LEAD, phone: PHONE }]));
  const deps = adminDepsFor(h);
  const dry = await handlePendingAction(adminRequest({ action: "replay", dryRun: true }), deps);
  assert.equal(((await dry.json()) as { counts: { would_apply: number } }).counts.would_apply, 1);
  assert.equal(h.pending.all[0].status, "open");
  const real = await handlePendingAction(adminRequest({ action: "replay" }), deps);
  assert.equal(((await real.json()) as { counts: { applied: number } }).counts.applied, 1);
  await h.runScheduled();
  assert.equal(h.flushes, 1);
});

test("dismiss closes an open update; the same action on a closed one is 404; an unknown action is 400", async () => {
  const h = harness({ leads: index([]) });
  await send(h, { phone: PHONE, ...OPEN_STATUS });
  const id = h.pending.all[0].id;
  const deps = adminDepsFor(h);
  assert.equal((await handlePendingAction(adminRequest({ action: "dismiss", id }), deps)).status, 200);
  assert.equal(h.pending.all[0].status, "dismissed");
  assert.equal((await handlePendingAction(adminRequest({ action: "dismiss", id }), deps)).status, 404);
  assert.equal((await handlePendingAction(adminRequest({ action: "delete-all" }), deps)).status, 400);
});
