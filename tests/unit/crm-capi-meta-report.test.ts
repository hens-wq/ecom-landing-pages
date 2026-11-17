import assert from "node:assert/strict";
import { test } from "node:test";

import type { CrmCapiConfig } from "@/lib/crm-capi/config";
import type { CrmMetaEvent } from "@/lib/crm-capi/event";
import { flushCrmEvents, type ClaimedCrmEvent, type CrmEventOutcome, type CrmOutbox } from "@/lib/crm-capi/pipeline";
import { sanitizeMetaText, sendCrmEvent, type CrmMetaReport, type FetchLike } from "@/lib/crm-capi/send";
import { formatLeadWebhookDiagnostic } from "@/lib/lead-status/webhook-diagnostic";

const TOKEN = "TEST-ONLY-TOKEN-NOT-A-SECRET-0123456789";
const LEAD = "1234567890123456";

const EVENT: CrmMetaEvent = {
  event_name: "QualifiedLead",
  event_time: 1_800_000_000,
  event_id: `crm:qualified:${LEAD}`,
  action_source: "system_generated",
  user_data: { lead_id: LEAD },
  custom_data: { event_source: "crm", lead_event_source: "Fireberry" },
};

const CONFIG: CrmCapiConfig = {
  datasetId: "987654321",
  accessToken: TOKEN,
  graphApiVersion: "v26.0",
  testEventCode: null,
  sendEnabled: true,
};

test("a success reports Meta's answer in sanitized form, never the token or the lead", async () => {
  const reports: CrmMetaReport[] = [];
  const fetchImpl: FetchLike = async () =>
    new Response(JSON.stringify({ events_received: 1, messages: [`lead ${LEAD} accepted`], fbtrace_id: "AbC123xyz" }), { status: 200 });
  assert.deepEqual(await sendCrmEvent(EVENT, CONFIG, fetchImpl, (r) => reports.push(r)), { ok: true });
  assert.equal(reports.length, 1);
  assert.equal(reports[0].httpStatus, 200);
  assert.equal(reports[0].eventsReceived, 1);
  assert.equal(reports[0].fbtrace_id, "AbC123xyz");
  assert.deepEqual(reports[0].messages, ["lead <number> accepted"]);
  assert.equal(reports[0].error, null);
  const text = JSON.stringify(reports[0]);
  assert.ok(!text.includes(TOKEN) && !text.includes(LEAD));
});

test("a refusal reports Meta's error type and code, and the result keeps its short code", async () => {
  const reports: CrmMetaReport[] = [];
  const fetchImpl: FetchLike = async () =>
    new Response(
      JSON.stringify({ error: { message: `Invalid parameter for ${LEAD}`, type: "OAuthException", code: 100, error_subcode: 2108006, fbtrace_id: "TRACE1" } }),
      { status: 400 }
    );
  assert.deepEqual(await sendCrmEvent(EVENT, CONFIG, fetchImpl, (r) => reports.push(r)), { ok: false, retryable: false, code: "http_400" });
  assert.equal(reports[0].httpStatus, 400);
  assert.equal(reports[0].error?.type, "OAuthException");
  assert.equal(reports[0].error?.code, 100);
  assert.equal(reports[0].error?.subcode, 2108006);
  assert.equal(reports[0].error?.message, "Invalid parameter for <number>");
  assert.equal(reports[0].fbtrace_id, "TRACE1");
  assert.ok(!JSON.stringify(reports[0]).includes(LEAD));
});

test("a failing report hook cannot change the send outcome", async () => {
  const fetchImpl: FetchLike = async () => new Response("{}", { status: 200 });
  assert.deepEqual(
    await sendCrmEvent(EVENT, CONFIG, fetchImpl, () => {
      throw new Error("log sink unavailable");
    }),
    { ok: true }
  );
});

test("sanitizeMetaText masks identifiers and token-like strings, and caps the length", () => {
  assert.equal(sanitizeMetaText("phone +972501234567 lead 1234567890123456"), "phone +<number> lead <number>");
  assert.equal(sanitizeMetaText(`token ${"a".repeat(40)}`), "token <redacted>");
  assert.equal(sanitizeMetaText("word ".repeat(100))?.length, 200);
  assert.equal(sanitizeMetaText(42), null);
});

test("the flush hands each Meta answer to the log hook with the event name and Dataset ID, never the lead", async () => {
  const rows: ClaimedCrmEvent[] = [
    { id: 1, leadKey: LEAD, eventType: "qualified", eventId: `crm:qualified:${LEAD}`, eventTime: new Date("2026-11-17T09:00:00Z"), attempts: 1 },
  ];
  const outcomes: CrmEventOutcome[] = [];
  const outbox: Pick<CrmOutbox, "claim" | "finish"> = {
    claim: async () => rows.splice(0),
    finish: async (_id, outcome) => {
      outcomes.push(outcome);
    },
  };
  const entries: unknown[] = [];
  const fetchImpl: FetchLike = async () => new Response(JSON.stringify({ events_received: 1, fbtrace_id: "T9" }), { status: 200 });
  const summary = await flushCrmEvents(
    { limit: 10, now: new Date("2026-11-17T09:01:00Z") },
    { config: CONFIG, outbox, fetchImpl, onMetaReport: (entry) => entries.push(entry) }
  );
  assert.equal(summary.sent, 1);
  assert.deepEqual(outcomes, [{ status: "sent" }]);
  assert.equal(entries.length, 1);
  const entry = entries[0] as Record<string, unknown>;
  assert.equal(entry.eventName, "QualifiedLead");
  assert.equal(entry.datasetId, "987654321");
  assert.equal(entry.eventsReceived, 1);
  assert.equal(entry.fbtrace_id, "T9");
  const text = JSON.stringify(entry);
  assert.ok(!text.includes(LEAD) && !text.includes(TOKEN));
});

test("the rating webhook diagnostic adds only booleans for a lookup miss", () => {
  assert.deepEqual(
    JSON.parse(formatLeadWebhookDiagnostic({ status: 404, reason: "not_found", operation: "rating", metaAvailable: false, leadIdProvided: true, phoneProvided: false })),
    { event: "lead_rating_webhook", status: 404, reason: "not_found", operation: "rating", metaAvailable: false, leadIdProvided: true, phoneProvided: false }
  );
  assert.deepEqual(
    JSON.parse(formatLeadWebhookDiagnostic({ status: 200, reason: "success", operation: "rating", matchedBy: "phone" })),
    { event: "lead_rating_webhook", status: 200, reason: "success", operation: "rating", matchedBy: "phone" }
  );
});
