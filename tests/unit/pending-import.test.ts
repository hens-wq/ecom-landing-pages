import assert from "node:assert/strict";
import { test } from "node:test";

import { parseImportRows } from "@/lib/lead-status/pending-import";

const NOW = new Date("2026-11-22T12:00:00Z");
const CHANGED = "2026-11-20T08:00:00Z";
const LEAD = "120210000000001111";

test("a Fireberry row with a phone, a raw rating code and a time becomes a pending rating at that time", () => {
  const result = parseImportRows([{ phone: "052-867-8178", pcfsystemfield350: 9, changedAt: CHANGED }], NOW);
  assert.equal(result.invalid.length, 0);
  assert.equal(result.valid.length, 1);
  const [row] = result.valid;
  assert.equal(row.kind, "rating");
  assert.equal(row.reason, "imported");
  assert.equal(row.normalizedPhone, "0528678178");
  assert.equal(row.leadIdHint, null);
  assert.deepEqual(row.payload, { studentRating: 4 });
  assert.equal(row.sourceAt.toISOString(), "2026-11-20T08:00:00.000Z", "the source time is the recorded change time, not the import time");
});

test("a leadId with a 1-5 studentRating is accepted, with the Meta Lead ID trimmed and kept", () => {
  const result = parseImportRows([{ leadId: ` ${LEAD} `, studentRating: 3, changedAt: CHANGED }], NOW);
  assert.equal(result.invalid.length, 0);
  assert.equal(result.valid[0].leadIdHint, LEAD);
  assert.deepEqual(result.valid[0].payload, { studentRating: 3 });
});

test("an empty rating is refused, in both field names: an import never clears a rating", () => {
  const result = parseImportRows(
    [
      { phone: "0528678178", pcfsystemfield350: null, changedAt: CHANGED },
      { phone: "0528678178", studentRating: null, changedAt: CHANGED },
    ],
    NOW
  );
  assert.equal(result.valid.length, 0);
  assert.deepEqual(result.invalid.map((item) => item.index), [0, 1]);
});

test("a row without a usable time is refused, never given a guessed one", () => {
  const result = parseImportRows(
    [
      { phone: "0528678178", pcfsystemfield350: 9 },
      { phone: "0528678178", pcfsystemfield350: 9, changedAt: "לא תאריך" },
      { phone: "0528678178", pcfsystemfield350: 9, changedAt: "   " },
    ],
    NOW
  );
  assert.equal(result.valid.length, 0);
  assert.equal(result.invalid.length, 3);
});

test("a time more than a day ahead is refused; a small clock difference is allowed", () => {
  const twoDaysAhead = new Date(NOW.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const anHourAhead = new Date(NOW.getTime() + 60 * 60 * 1000).toISOString();
  const result = parseImportRows(
    [
      { phone: "0528678178", pcfsystemfield350: 9, changedAt: twoDaysAhead },
      { phone: "0528678178", pcfsystemfield350: 9, changedAt: anHourAhead },
    ],
    NOW
  );
  assert.deepEqual(result.invalid.map((item) => item.index), [0]);
  assert.equal(result.valid.length, 1);
});

test("a row with neither leadId nor phone is refused", () => {
  const result = parseImportRows([{ pcfsystemfield350: 9, changedAt: CHANGED }], NOW);
  assert.equal(result.valid.length, 0);
  assert.equal(result.invalid[0].index, 0);
});

test("a rating outside the Fireberry codes 6-10, or the 1-5 scale, is refused", () => {
  const result = parseImportRows(
    [
      { phone: "0528678178", pcfsystemfield350: 5, changedAt: CHANGED },
      { phone: "0528678178", pcfsystemfield350: 11, changedAt: CHANGED },
      { phone: "0528678178", studentRating: 6, changedAt: CHANGED },
    ],
    NOW
  );
  assert.equal(result.valid.length, 0);
  assert.equal(result.invalid.length, 3);
});

test("two different ratings in one row are refused", () => {
  const result = parseImportRows([{ phone: "0528678178", studentRating: 2, pcfsystemfield350: 9, changedAt: CHANGED }], NOW);
  assert.equal(result.valid.length, 0);
  assert.equal(result.invalid.length, 1);
});

test("a row that is not an object is refused, and each row keeps its own index", () => {
  const result = parseImportRows([null, "text", { phone: "0528678178", pcfsystemfield350: 9, changedAt: CHANGED }], NOW);
  assert.deepEqual(result.invalid.map((item) => item.index), [0, 1]);
  assert.equal(result.valid.length, 1);
});

test("the same rating for the same lead gives the same key, so a repeated row in an export is counted once", () => {
  const first = parseImportRows([{ leadId: LEAD, pcfsystemfield350: 9, changedAt: CHANGED }], NOW).valid[0];
  const again = parseImportRows([{ leadId: LEAD, pcfsystemfield350: 9, changedAt: CHANGED }], NOW).valid[0];
  assert.equal(first.dedupeKey, again.dedupeKey);
});

test("a numeric phone from a spreadsheet is read as the same Israeli number", () => {
  const result = parseImportRows([{ phone: 528678178, pcfsystemfield350: 9, changedAt: CHANGED }], NOW);
  assert.equal(result.valid[0].normalizedPhone, "0528678178");
});
