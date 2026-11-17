import assert from "node:assert/strict";
import { test } from "node:test";

import { mergeStatusRecords } from "@/lib/lead-status/merge-status-records";
import { defaultLeadStatusRecord, type LeadStatusRecord } from "@/lib/lead-status/types";
import { StudentRatingFlames } from "@/components/leads/student-rating";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const ID = "updated-crm-lead";
const EARLIER = "2026-11-12T09:00:00.000Z";
const LATER = "2026-11-12T09:01:00.000Z";

function record(studentRating: number | null, updatedAt: string): LeadStatusRecord {
  return { ...defaultLeadStatusRecord(ID, null), studentRating, updatedAt };
}

function merge(incoming: LeadStatusRecord, saved: LeadStatusRecord): LeadStatusRecord {
  const selected = mergeStatusRecords(new Map([[ID, incoming]]), new Map([[ID, saved]])).get(ID);
  assert.ok(selected);
  return selected;
}

test("a refreshed CRM four-flame record replaces an older local save whose rating was null", () => {
  const refreshed = record(4, LATER);
  const selected = merge(refreshed, record(null, EARLIER));
  assert.equal(selected, refreshed);
  const html = renderToStaticMarkup(createElement(StudentRatingFlames, { rating: selected.studentRating }));
  assert.equal((html.match(/<svg\b/g) ?? []).length, 4, "the table receives the fresh rating rather than displaying the two-flame null default");
});

test("a confirmed save completed during refresh survives a stale batch response as a complete record", () => {
  const saved = { ...record(5, LATER), mainStatus: "נרשם" as const, secondaryStatus: "תשלום מלא", fullPaymentAmount: 18000 };
  const selected = merge(record(2, EARLIER), saved);
  assert.equal(selected, saved);
  assert.equal(selected.studentRating, 5);
  assert.equal(selected.fullPaymentAmount, 18000);
});

test("equal timestamps prefer the incoming record, including equivalent timestamps with different timezone offsets", () => {
  const incoming = record(4, LATER);
  assert.equal(merge(incoming, record(null, LATER)), incoming);
  assert.equal(merge(incoming, record(null, "2026-11-12T11:01:00.000+02:00")), incoming);
});

test("unknown timestamps prefer incoming data rather than retaining a potentially stale override", () => {
  for (const [incomingAt, savedAt] of [[LATER, "not-a-date"], ["", EARLIER], ["invalid", "invalid"]]) {
    const incoming = record(4, incomingAt);
    assert.equal(merge(incoming, record(2, savedAt)), incoming);
  }
});

test("records omitted from the current date-range response retain their confirmed save and neither input map is changed", () => {
  const incomingRecord = { ...record(3, LATER), leadId: "another-lead" };
  const saved = record(4, EARLIER);
  const incoming = new Map([[incomingRecord.leadId, incomingRecord]]);
  const confirmed = new Map([[ID, saved]]);
  const merged = mergeStatusRecords(incoming, confirmed);
  assert.equal(merged.get(ID), saved);
  assert.equal(merged.get(incomingRecord.leadId), incomingRecord);
  assert.deepEqual([...incoming], [[incomingRecord.leadId, incomingRecord]]);
  assert.deepEqual([...confirmed], [[ID, saved]]);
  assert.notEqual(merged, incoming);
});
