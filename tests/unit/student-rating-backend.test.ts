import assert from "node:assert/strict";
import { test } from "node:test";

import { checkCrmSyncRequest, syncCrmStatus, type CrmStatusStore, type CrmSyncInput, type DashboardLeadIndex } from "@/lib/lead-status/crm-sync";
import { defaultLeadStatusRecord, type LeadStatusRecord } from "@/lib/lead-status/types";
import { parseStudentRatingUpdate, storedStudentRating, type StudentRating } from "@/lib/lead-status/student-rating";

const ID = "known-dashboard-id";
const PHONE = "0500000001";
const index: DashboardLeadIndex = {
  metaAvailable: true,
  byId: new Map([[ID, { id: ID, name: null, phone: PHONE, normalizedPhone: PHONE, createdDate: "2026-11-01" }]]),
};

class MemoryStore implements CrmStatusStore {
  rows = new Map<string, LeadStatusRecord>();
  gets = 0;
  statusWrites = 0;
  ratingWrites = 0;
  failOnRead = false;
  beforeStatusWrite?: () => void;
  async get(id: string) {
    this.gets += 1;
    if (this.failOnRead) throw new Error("Rating-only updates must not read and rewrite statuses");
    const row = this.rows.get(id);
    return row ? { ...row } : undefined;
  }
  async findLeadIdsByNormalizedPhone(phone: string) {
    return [...this.rows.values()].filter((row) => row.normalizedPhone === phone).map((row) => row.leadId);
  }
  async upsert(id: string, patch: Parameters<CrmStatusStore["upsert"]>[1]) {
    this.statusWrites += 1;
    this.beforeStatusWrite?.();
    const existing = this.rows.get(id) ?? defaultLeadStatusRecord(id, null);
    const row: LeadStatusRecord = {
      ...existing,
      mainStatus: patch.mainStatus as LeadStatusRecord["mainStatus"],
      secondaryStatus: patch.secondaryStatus,
      normalizedPhone: patch.normalizedPhone === undefined ? existing.normalizedPhone : patch.normalizedPhone,
      fullPaymentAmount: patch.fullPaymentAmount === undefined ? existing.fullPaymentAmount : patch.fullPaymentAmount,
      partialPaymentAmount: patch.partialPaymentAmount === undefined ? existing.partialPaymentAmount : patch.partialPaymentAmount,
      studentRating: patch.studentRating === undefined ? existing.studentRating : patch.studentRating,
      updatedAt: "2026-11-12T09:00:00Z",
    };
    this.rows.set(id, row);
    return row;
  }
  async upsertStudentRating(id: string, rating: StudentRating | null, normalizedPhone?: string | null) {
    this.ratingWrites += 1;
    const existing = this.rows.get(id) ?? defaultLeadStatusRecord(id, null);
    const row = { ...existing, studentRating: rating, normalizedPhone: normalizedPhone === undefined ? existing.normalizedPhone : normalizedPhone, updatedAt: "2026-11-12T09:00:00Z" };
    this.rows.set(id, row);
    return row;
  }
}

function existingRecord(): LeadStatusRecord {
  return { ...defaultLeadStatusRecord(ID, PHONE), mainStatus: "נרשם", secondaryStatus: "תשלום מלא", fullPaymentAmount: 18000, partialPaymentAmount: 1000, studentRating: 3, updatedAt: "2026-11-01T09:00:00Z" };
}

test("verified Fireberry Picklist codes map to 1–5 flames, including legacy one and exact numeric strings", () => {
  for (const [raw, expected] of [[6, 1], [7, 2], [8, 3], [9, 4], [10, 5]]) {
    assert.deepEqual(parseStudentRatingUpdate({ pcfsystemfield350: raw }), { ok: true, provided: true, value: expected });
    assert.deepEqual(parseStudentRatingUpdate({ pcfsystemfield350: String(raw) }), { ok: true, provided: true, value: expected });
  }
  assert.deepEqual(parseStudentRatingUpdate({ pcfsystemfield350: " 9 " }), { ok: true, provided: true, value: 4 });
});

test("canonical values use the flame count and never confuse it with raw option IDs", () => {
  for (const rating of [1, 2, 3, 4, 5]) {
    assert.deepEqual(parseStudentRatingUpdate({ studentRating: rating }), { ok: true, provided: true, value: rating });
    assert.deepEqual(parseStudentRatingUpdate({ studentRating: String(rating) }), { ok: true, provided: true, value: rating });
  }
  assert.equal(parseStudentRatingUpdate({ studentRating: 9 }).ok, false);
  assert.equal(parseStudentRatingUpdate({ pcfsystemfield350: 4 }).ok, false);
});

test("the standard Fireberry reference accepts visible rating labels with agreeing number and flames, without guessing Picklist suffixes", () => {
  for (const [label, value] of [["1 - 🔥 - קר", 1], ["2 - 🔥🔥", 2], ["3 - 🔥🔥🔥", 3], ["4 - 🔥🔥🔥🔥", 4], ["5 - 🔥🔥🔥🔥🔥 - לוהט", 5], ["\u200f🔥🔥🔥🔥 - 4\u200e", 4]] as const) {
    assert.deepEqual(parseStudentRatingUpdate({ pcfsystemfield350: label }), { ok: true, provided: true, value });
  }
  for (const label of ["3 - 🔥🔥🔥🔥", "4 - 🔥🔥🔥🔥 5", "🔥🔥🔥🔥", "4 - great", "1 - 🔥 - לוהט", "4.0 - 🔥🔥🔥🔥", "0 - ", "6 - 🔥🔥🔥🔥🔥🔥"]) {
    assert.equal(parseStudentRatingUpdate({ pcfsystemfield350: label }).ok, false, label);
  }
  assert.equal(parseStudentRatingUpdate({ pcfsystemfield350: "4 - 🔥🔥🔥🔥", studentRating: 5 }).ok, false);
  assert.equal(parseStudentRatingUpdate({ studentRating: "4 - 🔥🔥🔥🔥" }).ok, false, "canonical field stays numeric");
});

test("omission preserves and explicit null clears, without inventing a default rating", () => {
  assert.deepEqual(parseStudentRatingUpdate({}), { ok: true, provided: false, value: undefined });
  assert.deepEqual(parseStudentRatingUpdate({ studentRating: undefined }), { ok: true, provided: false, value: undefined });
  assert.deepEqual(parseStudentRatingUpdate({ pcfsystemfield350: null }), { ok: true, provided: true, value: null });
  assert.deepEqual(parseStudentRatingUpdate({ studentRating: null }), { ok: true, provided: true, value: null });
  assert.equal(storedStudentRating(null), null);
  assert.equal(storedStudentRating(undefined), null);
  assert.equal(storedStudentRating(""), null);
  assert.equal(storedStudentRating(0), null);
  assert.equal(storedStudentRating("4"), 4);
});

test("both representations must agree, including explicit clears", () => {
  assert.deepEqual(parseStudentRatingUpdate({ pcfsystemfield350: 9, studentRating: 4 }), { ok: true, provided: true, value: 4 });
  assert.deepEqual(parseStudentRatingUpdate({ pcfsystemfield350: null, studentRating: null }), { ok: true, provided: true, value: null });
  for (const payload of [{ pcfsystemfield350: 9, studentRating: 5 }, { pcfsystemfield350: null, studentRating: 4 }, { pcfsystemfield350: 9, studentRating: null }]) {
    assert.equal(parseStudentRatingUpdate(payload).ok, false);
  }
});

test("malformed, fractional, empty, object and out-of-range ratings are rejected", () => {
  for (const value of [0, -1, 5.5, 11, NaN, Infinity, "", " ", "9.0", "09", "9abc", "🔥🔥🔥🔥", {}, [], true, false]) {
    assert.equal(parseStudentRatingUpdate({ pcfsystemfield350: value }).ok, false, String(value));
  }
  for (const value of [0, -1, 4.5, 6, NaN, Infinity, "", " ", "4.0", "04", "4abc", {}, [], true]) {
    assert.equal(parseStudentRatingUpdate({ studentRating: value }).ok, false, String(value));
  }
});

test("rating-only sync uses the dedicated atomic store operation without reading or resolving statuses/payments", async () => {
  const store = new MemoryStore();
  store.rows.set(ID, existingRecord());
  store.failOnRead = true;
  const result = await syncCrmStatus({ leadId: ID, studentRating: 4 }, index, store);
  assert.equal(result.ok, true);
  assert.equal(store.gets, 0);
  assert.equal(store.statusWrites, 0);
  assert.equal(store.ratingWrites, 1);
  const stored = store.rows.get(ID)!;
  assert.equal(stored.studentRating, 4);
  assert.equal(stored.mainStatus, "נרשם");
  assert.equal(stored.secondaryStatus, "תשלום מלא");
  assert.equal(stored.fullPaymentAmount, 18000);
  assert.equal(stored.partialPaymentAmount, 1000);
});

test("clear-only sync preserves existing enrolled status and payments", async () => {
  const store = new MemoryStore();
  store.rows.set(ID, existingRecord());
  const result = await syncCrmStatus({ leadId: ID, studentRating: null }, index, store);
  assert.equal(result.ok, true);
  assert.equal(store.rows.get(ID)?.studentRating, null);
  assert.equal(store.rows.get(ID)?.secondaryStatus, "תשלום מלא");
  assert.equal(store.rows.get(ID)?.fullPaymentAmount, 18000);
  assert.equal(store.gets, 0);
});

test("the first rating row retains the dashboard's implicit new status without inventing a rating for other leads", async () => {
  const store = new MemoryStore();
  const result = await syncCrmStatus({ leadId: ID, studentRating: 1 }, index, store);
  assert.equal(result.ok, true);
  assert.equal(store.rows.get(ID)?.studentRating, 1);
  assert.equal(store.rows.get(ID)?.mainStatus, "חדש");
  assert.equal(store.rows.get(ID)?.secondaryStatus, "חדש");
  assert.equal(defaultLeadStatusRecord("another", null).studentRating, null);
});

test("ordinary status writes preserve an omitted rating, including a rating changed after the status read", async () => {
  const store = new MemoryStore();
  store.rows.set(ID, existingRecord());
  store.beforeStatusWrite = () => { store.rows.get(ID)!.studentRating = 5; };
  const result = await syncCrmStatus({ leadId: ID, mainStatus: "בתהליך", secondaryStatus: "בתהליך" }, index, store);
  assert.equal(result.ok, true);
  assert.equal(store.statusWrites, 1);
  assert.equal(store.ratingWrites, 0);
  assert.equal(store.rows.get(ID)?.studentRating, 5, "the sync layer does not copy the previously read rating into the patch");
});

test("combined status and rating writes update both without clearing omitted payment amounts", async () => {
  const store = new MemoryStore();
  store.rows.set(ID, existingRecord());
  const result = await syncCrmStatus({ leadId: ID, mainStatus: "נרשם", secondaryStatus: "", studentRating: 5 }, index, store);
  assert.equal(result.ok, true);
  assert.equal(store.statusWrites, 1);
  assert.equal(store.ratingWrites, 0);
  assert.equal(store.rows.get(ID)?.studentRating, 5);
  assert.equal(store.rows.get(ID)?.secondaryStatus, "תשלום מלא");
  assert.equal(store.rows.get(ID)?.fullPaymentAmount, 18000);
});

test("invalid or empty requests fail before identity lookups and perform no writes", async () => {
  for (const input of [
    { leadId: ID },
    { leadId: ID, studentRating: 0 },
    { leadId: ID, studentRating: 4, partialPaymentAmount: 100 },
    { leadId: ID, mainStatus: "לא מעוניין", studentRating: 4 },
    { leadId: ID, secondaryStatus: "בתהליך", studentRating: 4 },
  ]) {
    const store = new MemoryStore();
    const result = await syncCrmStatus(input as CrmSyncInput, index, store);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 400);
    assert.equal(store.gets, 0);
    assert.equal(store.statusWrites + store.ratingWrites, 0);
  }
  assert.equal(checkCrmSyncRequest({ leadId: ID, mainStatus: "נרשם" }).ok, true);
});

test("matching keeps exact known dashboard IDs and unique phone fallback; ambiguous phone matches are refused", async () => {
  const store = new MemoryStore();
  let result = await syncCrmStatus({ leadId: ID, phone: "0500000002", studentRating: 4 }, index, store);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.matchedBy, "lead_id");
  result = await syncCrmStatus({ leadId: "unverified-fireberry-contact-id", phone: "+972500000001", studentRating: 4 }, index, store);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.matchedBy, "phone");
  const ambiguousIndex: DashboardLeadIndex = { ...index, byId: new Map([...index.byId, ["duplicate", { ...index.byId.get(ID)!, id: "duplicate" }]]) };
  const before = store.ratingWrites;
  result = await syncCrmStatus({ phone: PHONE, studentRating: 5 }, ambiguousIndex, store);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 409);
  assert.equal(store.ratingWrites, before);
});

test("an unmatched CRM contact ID without a unique phone never creates a status or rating row", async () => {
  const store = new MemoryStore();
  const result = await syncCrmStatus({ leadId: "unverified-fireberry-contact-id", studentRating: 4 }, index, store);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 404);
  assert.equal(store.ratingWrites, 0);
  assert.equal(store.rows.size, 0);
});
