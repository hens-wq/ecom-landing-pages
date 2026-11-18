import assert from "node:assert/strict";
import { test } from "node:test";

import { crmEventsForChange, isQualified, isRegistered, type LeadQualitySnapshot } from "@/lib/crm-capi/rules";
import { isSaleRecord } from "@/lib/lead-status/calculations";
import { MAIN_STATUSES, SECONDARY_STATUSES_BY_MAIN, defaultLeadStatusRecord, isMainStatus, isValidSecondaryStatus, type MainStatus } from "@/lib/lead-status/types";
import { checkStatusRequest, resolveStatusUpdate } from "@/lib/lead-status/validation";
import { activeAmount } from "@/lib/performance/lead-metrics";
import { classifyLeadQuality } from "@/lib/performance/lead-quality";

// "ברח במעמד התשלום" (fled at the payment stage): a main status with itself as its only
// secondary status. It is a qualified (green) lead, never a sale, and never a RegisteredLead.
const STATUS = "ברח במעמד התשלום";
const lead = (mainStatus: string, studentRating: number | null = null): LeadQualitySnapshot => ({
  mainStatus,
  secondaryStatus: mainStatus,
  studentRating,
});

test("the status is listed once as a main status, with itself as its only secondary status", () => {
  assert.equal(MAIN_STATUSES.filter((status) => status === STATUS).length, 1);
  assert.equal(isMainStatus(STATUS), true);
  assert.deepEqual(SECONDARY_STATUSES_BY_MAIN[STATUS], [STATUS]);
  assert.equal(isValidSecondaryStatus(STATUS, STATUS), true);
  assert.equal(isValidSecondaryStatus(STATUS, "נרשם"), false);
});

test("an update with the pair is accepted and stored with no payment amount", () => {
  assert.deepEqual(checkStatusRequest({ mainStatus: STATUS, secondaryStatus: STATUS }), {
    ok: true,
    value: { mainStatus: STATUS, secondaryStatus: STATUS },
  });
  assert.deepEqual(resolveStatusUpdate({ mainStatus: STATUS, secondaryStatus: STATUS }, undefined), {
    ok: true,
    value: { mainStatus: STATUS, secondaryStatus: STATUS, fullPaymentAmount: null, partialPaymentAmount: null },
  });
});

test("the status is never a sale, so it adds no sale, no revenue and no registration", () => {
  const record = { ...defaultLeadStatusRecord("1234567890123456", null), mainStatus: STATUS as MainStatus, secondaryStatus: STATUS, fullPaymentAmount: 1500 };
  assert.equal(isSaleRecord(record), false);
  assert.equal(activeAmount(STATUS, STATUS, 1500, null), null);
  assert.equal(isRegistered(lead(STATUS)), false);
});

test("the status is a green (qualified) lead in the dashboard's quality classification", () => {
  assert.equal(classifyLeadQuality(STATUS), "green");
});

test("the status qualifies a lead once, and a repeat of it sends nothing", () => {
  assert.equal(isQualified(lead(STATUS)), true);
  assert.deepEqual(crmEventsForChange(lead("חדש"), lead(STATUS)), ["qualified"]);
  assert.deepEqual(crmEventsForChange(lead(STATUS), lead(STATUS)), []);
});

test("a lead already qualified by בתהליך that fled, or fled and came back to בתהליך, gets no second qualified event", () => {
  assert.deepEqual(crmEventsForChange(lead("בתהליך"), lead(STATUS)), []);
  assert.deepEqual(crmEventsForChange(lead(STATUS), lead("בתהליך")), []);
});

test("a lead that fled and later enrolls gets its registration, and no second qualified event", () => {
  assert.deepEqual(crmEventsForChange(lead(STATUS), lead("נרשם")), ["registered"]);
});
