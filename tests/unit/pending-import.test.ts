import assert from "node:assert/strict";
import { test } from "node:test";

import { parseImportRows } from "@/lib/lead-status/pending-import";

const EXPORTED = new Date("2026-11-22T09:00:00Z");
const LEAD = "1202100000000111";

test("a Fireberry row with a phone and a raw rating code becomes a pending rating at the export time", () => {
  const result = parseImportRows([{ phone: "052-867-8178", pcfsystemfield350: 9 }], EXPORTED);
  assert.equal(result.invalid.length, 0);
  assert.equal(result.valid.length, 1);
  const [row] = result.valid;
  assert.equal(row.index, 0);
  assert.equal(row.update.kind, "rating");
  assert.equal(row.update.reason, "imported");
  assert.equal(row.update.normalizedPhone, "0528678178");
  assert.equal(row.update.leadIdHint, null);
  assert.deepEqual(row.update.payload, { studentRating: 4 });
  assert.equal(row.update.sourceAt.toISOString(), EXPORTED.toISOString(), "the source time is the export time, never a row's own date");
});

test("a leadId with a 1-5 studentRating is accepted, trimmed and kept", () => {
  const result = parseImportRows([{ leadId: ` ${LEAD} `, studentRating: 3 }], EXPORTED);
  assert.equal(result.invalid.length, 0);
  assert.equal(result.valid[0].update.leadIdHint, LEAD);
  assert.deepEqual(result.valid[0].update.payload, { studentRating: 3 });
});

test("an empty rating is refused, in both field names: an import never clears a rating", () => {
  const result = parseImportRows(
    [
      { phone: "0528678178", pcfsystemfield350: null },
      { phone: "0528678178", studentRating: null },
    ],
    EXPORTED
  );
  assert.equal(result.valid.length, 0);
  assert.deepEqual(
    result.invalid.map((item) => item.index),
    [0, 1]
  );
});

test("a row with a time field of its own is refused, whatever its rating", () => {
  const result = parseImportRows(
    [
      { phone: "0528678178", pcfsystemfield350: 9, changedAt: "2026-11-20T08:00:00Z" },
      { phone: "0528678178", pcfsystemfield350: 9, modifiedOn: "2026-11-20T08:00:00Z" },
    ],
    EXPORTED
  );
  assert.equal(result.valid.length, 0);
  assert.equal(result.invalid.length, 2);
});

test("a row with neither leadId nor phone is refused", () => {
  const result = parseImportRows([{ pcfsystemfield350: 9 }], EXPORTED);
  assert.equal(result.valid.length, 0);
  assert.equal(result.invalid[0].index, 0);
});

test("a rating outside the Fireberry codes 6-10, or the 1-5 scale, is refused", () => {
  const result = parseImportRows(
    [
      { phone: "0528678178", pcfsystemfield350: 5 },
      { phone: "0528678178", pcfsystemfield350: 11 },
      { phone: "0528678178", studentRating: 6 },
    ],
    EXPORTED
  );
  assert.equal(result.valid.length, 0);
  assert.equal(result.invalid.length, 3);
});

test("two different ratings in one row are refused", () => {
  const result = parseImportRows([{ phone: "0528678178", studentRating: 2, pcfsystemfield350: 9 }], EXPORTED);
  assert.equal(result.valid.length, 0);
  assert.equal(result.invalid.length, 1);
});

test("a row that is not an object is refused, and each row keeps its own position", () => {
  const result = parseImportRows([null, "text", { phone: "0528678178", pcfsystemfield350: 9 }], EXPORTED);
  assert.deepEqual(
    result.invalid.map((item) => item.index),
    [0, 1]
  );
  assert.deepEqual(
    result.valid.map((item) => item.index),
    [2]
  );
});

test("the same rating for the same lead gives the same key, so a repeated row in an export is counted once", () => {
  const first = parseImportRows([{ leadId: LEAD, pcfsystemfield350: 9 }], EXPORTED).valid[0].update;
  const again = parseImportRows([{ leadId: LEAD, pcfsystemfield350: 9 }], EXPORTED).valid[0].update;
  assert.equal(first.dedupeKey, again.dedupeKey);
});

test("a numeric phone from a spreadsheet is read as the same Israeli number", () => {
  const result = parseImportRows([{ phone: 528678178, pcfsystemfield350: 9 }], EXPORTED);
  assert.equal(result.valid[0].update.normalizedPhone, "0528678178");
});
