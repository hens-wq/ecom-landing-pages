import assert from "node:assert/strict";
import { test } from "node:test";

import type { CrmCapiConfig } from "@/lib/crm-capi/config";
import { crmEventId } from "@/lib/crm-capi/event";
import {
  flushCrmEvents,
  recordCrmChange,
  type ClaimedCrmEvent,
  type CrmEventOutcome,
  type CrmOutbox,
  type NewCrmEvent,
} from "@/lib/crm-capi/pipeline";
import type { CrmEventType } from "@/lib/crm-capi/rules";
import type { FetchLike } from "@/lib/crm-capi/send";
import { syncCrmStatus, type CrmStatusStore, type DashboardLeadIndex } from "@/lib/lead-status/crm-sync";
import type { LeadStatusRecord, MainStatus } from "@/lib/lead-status/types";
import type { StudentRating } from "@/lib/lead-status/student-rating";

// End to end, in memory: the webhook's status update (the real syncCrmStatus), the
// queueing of CRM events, the outbox rules and the Meta payloads. No database, no network.

const LEAD = "1234567890123456";
const CREATED = "2026-11-15";
const CONFIG: CrmCapiConfig = {
  datasetId: "987654321",
  accessToken: "TEST-ONLY-TOKEN",
  graphApiVersion: "v26.0",
  testEventCode: null,
  sendEnabled: true,
};
const INDEX: DashboardLeadIndex = {
  byId: new Map([[LEAD, { id: LEAD, name: null, phone: null, normalizedPhone: null, createdDate: CREATED }]]),
  metaAvailable: true,
};

const at = (iso: string) => new Date(iso);
const seconds = (date: Date) => Math.floor(date.getTime() / 1000);

function memoryStore(): CrmStatusStore {
  const rows = new Map<string, LeadStatusRecord>();
  return {
    async get(leadId) {
      return rows.get(leadId);
    },
    async findLeadIdsByNormalizedPhone() {
      return [];
    },
    async upsertStudentRating(leadId, studentRating, normalizedPhone) {
      const existing = rows.get(leadId);
      const record: LeadStatusRecord = {
        leadId,
        normalizedPhone: normalizedPhone ?? existing?.normalizedPhone ?? null,
        mainStatus: existing?.mainStatus ?? ("חדש" as MainStatus),
        secondaryStatus: existing?.secondaryStatus ?? "חדש",
        fullPaymentAmount: existing?.fullPaymentAmount ?? null,
        partialPaymentAmount: existing?.partialPaymentAmount ?? null,
        studentRating,
        updatedAt: new Date(0).toISOString(),
      };
      rows.set(leadId, record);
      // As the Postgres repository returns it: undefined when no row was stored before this write.
      return { ...record, previousStudentRating: existing ? (existing.studentRating as StudentRating | null) : undefined };
    },
    async upsert(leadId, patch) {
      const existing = rows.get(leadId);
      const record: LeadStatusRecord = {
        leadId,
        normalizedPhone: patch.normalizedPhone !== undefined ? patch.normalizedPhone : (existing?.normalizedPhone ?? null),
        mainStatus: patch.mainStatus as MainStatus,
        secondaryStatus: patch.secondaryStatus,
        fullPaymentAmount: patch.fullPaymentAmount !== undefined ? patch.fullPaymentAmount : (existing?.fullPaymentAmount ?? null),
        partialPaymentAmount: patch.partialPaymentAmount !== undefined ? patch.partialPaymentAmount : (existing?.partialPaymentAmount ?? null),
        studentRating: patch.studentRating !== undefined ? patch.studentRating : (existing?.studentRating ?? null),
        updatedAt: new Date(0).toISOString(),
      };
      rows.set(leadId, record);
      return record;
    },
  };
}

interface Row {
  id: number;
  leadKey: string;
  eventType: CrmEventType;
  eventId: string;
  eventTime: Date;
  status: "pending" | "sending" | "retry" | "sent" | "failed" | "skipped";
  attempts: number;
  nextAttemptAt: Date;
  claimedUntil: Date | null;
  lastError: string | null;
}

function memoryOutbox(): CrmOutbox & { rows: Row[] } {
  const rows: Row[] = [];
  return {
    rows,
    async enqueue(events: NewCrmEvent[], now: Date) {
      let queued = 0;
      for (const event of events) {
        // Mirrors ON CONFLICT (lead_key, event_type) DO NOTHING.
        if (rows.some((row) => row.leadKey === event.leadKey && row.eventType === event.eventType)) continue;
        rows.push({
          id: rows.length + 1,
          leadKey: event.leadKey,
          eventType: event.eventType,
          eventId: event.eventId,
          eventTime: event.eventTime,
          status: "pending",
          attempts: 0,
          nextAttemptAt: now,
          claimedUntil: null,
          lastError: null,
        });
        queued += 1;
      }
      return queued;
    },
    async claim(limit: number, now: Date, leaseUntil: Date): Promise<ClaimedCrmEvent[]> {
      // Mirrors the SQL: due rows, or rows whose lease has expired.
      const due = rows
        .filter(
          (row) =>
            ((row.status === "pending" || row.status === "retry") && row.nextAttemptAt.getTime() <= now.getTime()) ||
            (row.status === "sending" && row.claimedUntil !== null && row.claimedUntil.getTime() < now.getTime())
        )
        .slice(0, limit);
      for (const row of due) {
        row.status = "sending";
        row.attempts += 1;
        row.claimedUntil = leaseUntil;
      }
      return due.map((row) => ({
        id: row.id,
        leadKey: row.leadKey,
        eventType: row.eventType,
        eventId: row.eventId,
        eventTime: row.eventTime,
        attempts: row.attempts,
      }));
    },
    async finish(id: number, outcome: CrmEventOutcome) {
      const row = rows.find((candidate) => candidate.id === id);
      assert.ok(row, "finish() called for an unknown row");
      row.claimedUntil = null;
      if (outcome.status === "retry") {
        row.status = "retry";
        row.nextAttemptAt = outcome.nextAttemptAt;
        row.lastError = outcome.code;
      } else if (outcome.status === "sent") {
        row.status = "sent";
        row.lastError = null;
      } else {
        row.status = outcome.status;
        row.lastError = outcome.code;
      }
    },
  };
}

interface SentEvent {
  event_name: string;
  event_time: number;
  event_id: string;
  action_source: string;
  user_data: { lead_id: string };
  custom_data: { event_source: string; lead_event_source: string };
}

function fakeMeta(statusFor: (eventName: string, attempt: number) => number = () => 200) {
  const sent: { event: SentEvent; status: number }[] = [];
  const attempts = new Map<string, number>();
  const fetchImpl: FetchLike = async (_url, init) => {
    const body = JSON.parse(String(init.body)) as { data: SentEvent[] };
    const event = body.data[0];
    const attempt = (attempts.get(event.event_id) ?? 0) + 1;
    attempts.set(event.event_id, attempt);
    const status = statusFor(event.event_name, attempt);
    sent.push({ event, status });
    return new Response("{}", { status });
  };
  return { fetchImpl, sent };
}

function harness(statusFor?: (eventName: string, attempt: number) => number) {
  const store = memoryStore();
  const outbox = memoryOutbox();
  const meta = fakeMeta(statusFor);
  let sendEnabled = true;

  /** The webhook's path: save the status, then queue the CRM events for the change, as the route does. */
  async function webhook(
    update: { mainStatus: string; secondaryStatus: string; studentRating?: StudentRating | null; fullPaymentAmount?: number | null },
    statusChangedAt: Date | undefined,
    now: Date
  ): Promise<number> {
    const result = await syncCrmStatus({ leadId: LEAD, phone: null, ...update }, INDEX, store);
    if (!result.ok) throw new Error(`status update refused: ${result.message}`);
    return recordCrmChange(
      {
        leadKey: result.leadId,
        previous: result.previous,
        next: result.record,
        statusChangedAt,
        leadCreatedDate: INDEX.byId.get(result.leadId)?.createdDate,
        now,
      },
      { sendEnabled, outbox }
    );
  }

  /** The webhook's rating-only path: a rating with no status in the request. */
  async function rate(studentRating: StudentRating, statusChangedAt: Date | undefined, now: Date): Promise<number> {
    const result = await syncCrmStatus({ leadId: LEAD, phone: null, studentRating }, INDEX, store);
    if (!result.ok) throw new Error(`rating refused: ${result.message}`);
    return recordCrmChange(
      {
        leadKey: result.leadId,
        previous: result.previous,
        next: result.record,
        statusChangedAt,
        leadCreatedDate: INDEX.byId.get(result.leadId)?.createdDate,
        now,
      },
      { sendEnabled, outbox }
    );
  }

  async function flush(now: Date, limit = 50) {
    return flushCrmEvents({ limit, now }, { config: { ...CONFIG, sendEnabled }, outbox, fetchImpl: meta.fetchImpl });
  }

  return {
    outbox,
    meta,
    webhook,
    rate,
    flush,
    setSending(value: boolean) {
      sendEnabled = value;
    },
  };
}

test("a lead that reaches בתהליך, is rated 5, then reaches נרשם gets one raw, one qualified and one registration event", async () => {
  const h = harness();
  // The first sighting of a recent lead queues its raw lead. A repeat of חדש changes nothing.
  assert.equal(await h.webhook({ mainStatus: "חדש", secondaryStatus: "חדש" }, undefined, at("2026-11-16T08:00:00Z")), 1);
  assert.equal(await h.webhook({ mainStatus: "בתהליך", secondaryStatus: "בתהליך" }, at("2026-11-16T09:00:00Z"), at("2026-11-16T09:00:00Z")), 1);
  assert.equal(
    await h.webhook({ mainStatus: "בתהליך", secondaryStatus: "בתהליך", studentRating: 5 }, at("2026-11-16T10:00:00Z"), at("2026-11-16T10:00:00Z")),
    0
  );
  assert.equal(await h.webhook({ mainStatus: "נרשם", secondaryStatus: "נרשם" }, at("2026-11-16T11:00:00Z"), at("2026-11-16T11:00:00Z")), 1);
  assert.equal(
    await h.webhook({ mainStatus: "נרשם", secondaryStatus: "תשלום מלא", fullPaymentAmount: 1500 }, at("2026-11-16T11:30:00Z"), at("2026-11-16T11:30:00Z")),
    0
  );

  const summary = await h.flush(at("2026-11-16T12:00:00Z"));
  assert.deepEqual(summary, { state: "ran", claimed: 3, sent: 3, retried: 0, failed: 0, skipped: 0, deferred: 0 });
  assert.deepEqual(
    h.meta.sent.map((item) => item.event.event_name),
    ["RawLead", "QualifiedLead", "RegisteredLead"]
  );
  assert.deepEqual(
    h.meta.sent.map((item) => item.event.event_time),
    [seconds(at("2026-11-16T08:00:00Z")), seconds(at("2026-11-16T09:00:00Z")), seconds(at("2026-11-16T11:00:00Z"))]
  );
  assert.deepEqual(h.meta.sent.map((item) => item.event.event_id), [crmEventId("raw", LEAD), crmEventId("qualified", LEAD), crmEventId("registered", LEAD)]);
  for (const { event } of h.meta.sent) {
    assert.equal(event.user_data.lead_id, LEAD);
    assert.equal(event.action_source, "system_generated");
    assert.deepEqual(event.custom_data, { event_source: "crm", lead_event_source: "Fireberry" });
  }

  // The same status arriving again changes nothing.
  assert.equal(await h.webhook({ mainStatus: "נרשם", secondaryStatus: "נרשם" }, at("2026-11-16T13:00:00Z"), at("2026-11-16T13:00:00Z")), 0);
  assert.deepEqual(await h.flush(at("2026-11-16T13:05:00Z")), { state: "ran", claimed: 0, sent: 0, retried: 0, failed: 0, skipped: 0, deferred: 0 });
  assert.equal(h.outbox.rows.length, 3);
  assert.deepEqual(
    h.outbox.rows.map((row) => row.status),
    ["sent", "sent", "sent"]
  );
});

test("a lead rated 4 before any status change gets its raw lead, its qualified event once, then its registration", async () => {
  const h = harness();
  assert.equal(
    await h.webhook({ mainStatus: "חדש", secondaryStatus: "חדש", studentRating: 4 }, at("2026-11-16T09:00:00Z"), at("2026-11-16T09:00:00Z")),
    2
  );
  assert.equal(
    await h.webhook({ mainStatus: "בתהליך", secondaryStatus: "בתהליך", studentRating: 4 }, at("2026-11-16T09:30:00Z"), at("2026-11-16T09:30:00Z")),
    0
  );
  assert.equal(
    await h.webhook({ mainStatus: "נרשם", secondaryStatus: "נרשם", studentRating: 4 }, at("2026-11-16T10:00:00Z"), at("2026-11-16T10:00:00Z")),
    1
  );
  await h.flush(at("2026-11-16T11:00:00Z"));
  assert.deepEqual(
    h.meta.sent.map((item) => item.event.event_name),
    ["RawLead", "QualifiedLead", "RegisteredLead"]
  );
});

test("a lead that goes back to לא מעוניין and forward to בתהליך again still produces one qualified event", async () => {
  const h = harness();
  assert.equal(await h.webhook({ mainStatus: "בתהליך", secondaryStatus: "בתהליך" }, at("2026-11-16T09:00:00Z"), at("2026-11-16T09:00:00Z")), 2);
  assert.equal(await h.webhook({ mainStatus: "לא מעוניין", secondaryStatus: 'ל"מ - מחיר יקר' }, at("2026-11-16T09:30:00Z"), at("2026-11-16T09:30:00Z")), 0);
  assert.equal(await h.webhook({ mainStatus: "בתהליך", secondaryStatus: "בתהליך" }, at("2026-11-16T10:00:00Z"), at("2026-11-16T10:00:00Z")), 0);
  assert.equal(await h.webhook({ mainStatus: "נרשם", secondaryStatus: "נרשם" }, at("2026-11-16T11:00:00Z"), at("2026-11-16T11:00:00Z")), 1);
  await h.flush(at("2026-11-16T12:00:00Z"));
  assert.deepEqual(
    h.meta.sent.map((item) => item.event.event_name),
    ["RawLead", "QualifiedLead", "RegisteredLead"]
  );
});

test("while sending is off nothing is queued, and switching it on later does not send the older changes", async () => {
  const h = harness();
  h.setSending(false);
  assert.equal(await h.webhook({ mainStatus: "בתהליך", secondaryStatus: "בתהליך" }, at("2026-11-16T09:00:00Z"), at("2026-11-16T09:00:00Z")), 0);
  assert.equal(await h.webhook({ mainStatus: "נרשם", secondaryStatus: "נרשם" }, at("2026-11-16T10:00:00Z"), at("2026-11-16T10:00:00Z")), 0);
  assert.deepEqual(await h.flush(at("2026-11-16T11:00:00Z")), { state: "disabled", claimed: 0, sent: 0, retried: 0, failed: 0, skipped: 0, deferred: 0 });
  assert.equal(h.outbox.rows.length, 0);

  h.setSending(true);
  assert.equal(await h.webhook({ mainStatus: "נרשם", secondaryStatus: "נרשם" }, at("2026-11-16T12:00:00Z"), at("2026-11-16T12:00:00Z")), 0);
  assert.deepEqual(await h.flush(at("2026-11-16T12:05:00Z")), { state: "ran", claimed: 0, sent: 0, retried: 0, failed: 0, skipped: 0, deferred: 0 });
  assert.equal(h.meta.sent.length, 0);
});

test("a lead first seen through its rating alone gets its raw lead and its qualified event, once", async () => {
  const h = harness();
  assert.equal(await h.rate(4, at("2026-11-16T09:00:00Z"), at("2026-11-16T09:00:00Z")), 2);
  assert.equal(await h.rate(5, at("2026-11-16T09:30:00Z"), at("2026-11-16T09:30:00Z")), 0);
  await h.flush(at("2026-11-16T10:00:00Z"));
  assert.deepEqual(
    h.meta.sent.map((item) => item.event.event_name),
    ["RawLead", "QualifiedLead"]
  );
});

test("an old lead seen for the first time queues nothing, and a later change to it queues only that change", async () => {
  const h = harness();
  const now = at("2026-11-16T09:00:00Z");
  const first = await recordCrmChange(
    {
      leadKey: LEAD,
      previous: undefined,
      next: { mainStatus: "בתהליך", studentRating: null },
      statusChangedAt: undefined,
      leadCreatedDate: "2026-10-01",
      now,
    },
    { sendEnabled: true, outbox: h.outbox }
  );
  assert.equal(first, 0);
  assert.equal(h.outbox.rows.length, 0);

  const later = await recordCrmChange(
    {
      leadKey: LEAD,
      previous: { mainStatus: "בתהליך", studentRating: null },
      next: { mainStatus: "נרשם", studentRating: null },
      statusChangedAt: at("2026-11-16T08:30:00Z"),
      leadCreatedDate: "2026-10-01",
      now,
    },
    { sendEnabled: true, outbox: h.outbox }
  );
  assert.equal(later, 1);
  assert.equal(h.outbox.rows[0].eventType, "registered");
});

test("a Meta refusal of the qualified event does not block the others, and the retry sends the qualified event once", async () => {
  const h = harness((name, attempt) => (name === "QualifiedLead" && attempt === 1 ? 500 : 200));
  await h.webhook({ mainStatus: "בתהליך", secondaryStatus: "בתהליך" }, at("2026-11-16T09:00:00Z"), at("2026-11-16T09:00:00Z"));
  await h.webhook({ mainStatus: "נרשם", secondaryStatus: "נרשם" }, at("2026-11-16T10:00:00Z"), at("2026-11-16T10:00:00Z"));

  assert.deepEqual(await h.flush(at("2026-11-16T10:30:00Z")), { state: "ran", claimed: 3, sent: 2, retried: 1, failed: 0, skipped: 0, deferred: 0 });
  assert.deepEqual(await h.flush(at("2026-11-16T10:31:01Z")), { state: "ran", claimed: 1, sent: 1, retried: 0, failed: 0, skipped: 0, deferred: 0 });
  assert.deepEqual(await h.flush(at("2026-11-16T12:00:00Z")), { state: "ran", claimed: 0, sent: 0, retried: 0, failed: 0, skipped: 0, deferred: 0 });

  const accepted = h.meta.sent.filter((item) => item.status === 200).map((item) => item.event.event_name);
  assert.deepEqual(accepted.sort(), ["QualifiedLead", "RawLead", "RegisteredLead"]);
});

test("a lead without a Meta Lead ID is recorded and skipped, never sent", async () => {
  const h = harness();
  const queued = await recordCrmChange(
    {
      leadKey: "landing-7",
      previous: undefined,
      next: { mainStatus: "בתהליך", studentRating: null },
      statusChangedAt: undefined,
      leadCreatedDate: CREATED,
      now: at("2026-11-16T09:00:00Z"),
    },
    { sendEnabled: true, outbox: h.outbox }
  );
  assert.equal(queued, 2);
  assert.deepEqual(await h.flush(at("2026-11-16T09:01:00Z")), { state: "ran", claimed: 2, sent: 0, retried: 0, failed: 0, skipped: 2, deferred: 0 });
  assert.equal(h.meta.sent.length, 0);
  assert.ok(h.outbox.rows.every((row) => row.lastError === "invalid_meta_lead_id"));
});

test("a CRM timestamp from before the lead existed is replaced by the arrival time", async () => {
  const h = harness();
  const arrival = at("2026-11-16T09:00:00Z");
  await h.webhook({ mainStatus: "בתהליך", secondaryStatus: "בתהליך" }, at("2026-11-01T10:00:00Z"), arrival);
  await h.flush(at("2026-11-16T09:01:00Z"));
  assert.equal(h.meta.sent.length, 2);
  assert.deepEqual(
    h.meta.sent.map((item) => item.event.event_name),
    ["RawLead", "QualifiedLead"]
  );
  assert.deepEqual(
    h.meta.sent.map((item) => item.event.event_time),
    [seconds(arrival), seconds(arrival)]
  );
});

test("a CRM timestamp older than seven days is skipped, never sent", async () => {
  const h = harness();
  // Recorded with a creation date the day before, so the lead is recent when the change is
  // recorded, and the timestamp is kept as the CRM sent it.
  await recordCrmChange(
    {
      leadKey: LEAD,
      previous: undefined,
      next: { mainStatus: "נרשם", studentRating: null },
      statusChangedAt: at("2026-11-01T10:00:00Z"),
      leadCreatedDate: "2026-11-01",
      now: at("2026-11-02T10:00:00Z"),
    },
    { sendEnabled: true, outbox: h.outbox }
  );
  assert.deepEqual(await h.flush(at("2026-11-16T09:00:00Z")), { state: "ran", claimed: 3, sent: 0, retried: 0, failed: 0, skipped: 3, deferred: 0 });
  assert.equal(h.meta.sent.length, 0);
  assert.ok(h.outbox.rows.every((row) => row.lastError === "event_too_old"));
});

test("a row whose database update fails after Meta accepted it is deferred, then sent again once its lease expires", async () => {
  const h = harness();
  await h.webhook({ mainStatus: "בתהליך", secondaryStatus: "בתהליך" }, at("2026-11-16T09:00:00Z"), at("2026-11-16T09:00:00Z"));
  await h.webhook({ mainStatus: "נרשם", secondaryStatus: "נרשם" }, at("2026-11-16T10:00:00Z"), at("2026-11-16T10:00:00Z"));

  let writes = 0;
  const flakyOutbox: CrmOutbox = {
    enqueue: h.outbox.enqueue,
    claim: h.outbox.claim,
    async finish(id, outcome, now) {
      writes += 1;
      if (writes === 1) throw new Error("connection reset");
      return h.outbox.finish(id, outcome, now);
    },
  };
  const first = await flushCrmEvents({ limit: 50, now: at("2026-11-16T11:00:00Z") }, { config: CONFIG, outbox: flakyOutbox, fetchImpl: h.meta.fetchImpl });
  assert.deepEqual(first, { state: "ran", claimed: 3, sent: 2, retried: 0, failed: 0, skipped: 0, deferred: 1 });

  // The deferred row (the raw lead, first in line) has its five-minute lease expire, and is then sent again.
  const later = await h.flush(at("2026-11-16T11:06:00Z"));
  assert.equal(later.sent, 1);
  assert.equal(h.meta.sent.filter((item) => item.event.event_name === "RawLead").length, 2);
});
