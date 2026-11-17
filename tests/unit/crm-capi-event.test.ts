import assert from "node:assert/strict";
import { test } from "node:test";

import { buildCrmEvent, crmEventId } from "@/lib/crm-capi/event";

const LEAD = "1234567890123456";
const NOW = new Date("2026-11-16T10:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

test("a qualified change becomes a CRM event: system_generated, its own name, never a website Lead", () => {
  const built = buildCrmEvent({ eventType: "qualified", metaLeadId: LEAD, eventTime: NOW, now: NOW });
  if (!built.ok) return assert.fail("expected a built event");
  assert.equal(built.event.event_name, "QualifiedLead");
  assert.equal(built.event.action_source, "system_generated");
  assert.notEqual(built.event.event_name, "Lead");
  assert.deepEqual(built.event.custom_data, { event_source: "crm", lead_event_source: "Fireberry" });
  assert.deepEqual(built.event.user_data, { lead_id: LEAD });
  assert.equal(built.event.event_time, Math.floor(NOW.getTime() / 1000));
  assert.equal(built.event.event_id, `crm:qualified:${LEAD}`);
});

test("a registration gets its own event name", () => {
  const built = buildCrmEvent({ eventType: "registered", metaLeadId: LEAD, eventTime: NOW, now: NOW });
  if (!built.ok) return assert.fail("expected a built event");
  assert.equal(built.event.event_name, "RegisteredLead");
});

test("the same lead and event type always give the same event id", () => {
  assert.equal(crmEventId("qualified", LEAD), crmEventId("qualified", LEAD));
  assert.notEqual(crmEventId("qualified", LEAD), crmEventId("registered", LEAD));
});

test("only Meta Lead IDs of 15 to 17 digits are sent; other IDs are refused", () => {
  for (const metaLeadId of ["lead-1", "5f1c2a9e-7d3b-4c8a-9e10-aaaaaaaaaaaa", "12345", "1234567890123456789012"]) {
    const built = buildCrmEvent({ eventType: "qualified", metaLeadId, eventTime: NOW, now: NOW });
    assert.deepEqual(built, { ok: false, reason: "invalid_meta_lead_id" }, metaLeadId);
  }
});

test("an event older than seven days is too old; exactly seven days still goes", () => {
  const sevenDaysAgo = new Date(NOW.getTime() - 7 * DAY_MS);
  const eightDaysAgo = new Date(NOW.getTime() - 8 * DAY_MS);
  assert.equal(buildCrmEvent({ eventType: "registered", metaLeadId: LEAD, eventTime: sevenDaysAgo, now: NOW }).ok, true);
  assert.deepEqual(buildCrmEvent({ eventType: "registered", metaLeadId: LEAD, eventTime: eightDaysAgo, now: NOW }), {
    ok: false,
    reason: "event_too_old",
  });
});

test("a timestamp in the future is sent as now, never refused", () => {
  const later = new Date(NOW.getTime() + 60 * 60 * 1000);
  const built = buildCrmEvent({ eventType: "qualified", metaLeadId: LEAD, eventTime: later, now: NOW });
  if (!built.ok) return assert.fail("expected a built event");
  assert.equal(built.event.event_time, Math.floor(NOW.getTime() / 1000));
});

test("no personal data and no test code inside the event", () => {
  const built = buildCrmEvent({ eventType: "qualified", metaLeadId: LEAD, eventTime: NOW, now: NOW });
  if (!built.ok) return assert.fail("expected a built event");
  assert.deepEqual(Object.keys(built.event.user_data), ["lead_id"]);
  assert.equal("test_event_code" in built.event, false);
  assert.doesNotMatch(JSON.stringify(built.event), /"(em|ph|email|phone|fn|ln|external_id)"/);
});
