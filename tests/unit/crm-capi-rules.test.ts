import assert from "node:assert/strict";
import { test } from "node:test";

import { crmEventsForChange, isQualified, isRegistered, type LeadQualitySnapshot } from "@/lib/crm-capi/rules";

const lead = (mainStatus: string, studentRating: number | null = null): LeadQualitySnapshot => ({ mainStatus, studentRating });

test("qualified: CRM status בתהליך or נרשם, or a student rating of 4 or 5 flames", () => {
  assert.equal(isQualified(lead("בתהליך")), true);
  assert.equal(isQualified(lead("נרשם")), true);
  assert.equal(isQualified(lead("חדש", 4)), true);
  assert.equal(isQualified(lead("חדש", 5)), true);
});

test("not qualified: no rating, a rating of 1 to 3, or any other status", () => {
  assert.equal(isQualified(lead("חדש")), false);
  assert.equal(isQualified(lead("חדש", 3)), false);
  assert.equal(isQualified(lead("חדש", 1)), false);
  assert.equal(isQualified(lead("אין מענה")), false);
  assert.equal(isQualified(lead("לא מעוניין", null)), false);
});

test("registered: only the CRM status נרשם", () => {
  assert.equal(isRegistered(lead("נרשם")), true);
  assert.equal(isRegistered(lead("בתהליך", 5)), false);
});

test("a lead that qualifies by status and then by rating gets one qualified event", () => {
  const states = [lead("חדש"), lead("בתהליך"), lead("בתהליך", 5), lead("בתהליך", 4)];
  const events = states.slice(1).map((next, index) => crmEventsForChange(states[index], next));
  assert.deepEqual(events, [["qualified"], [], []]);
});

test("a lead already qualified by rating that reaches נרשם gets only the registration", () => {
  assert.deepEqual(crmEventsForChange(lead("חדש", 5), lead("נרשם", 5)), ["registered"]);
});

test("a lead that jumps straight to נרשם gets qualified first, then registered", () => {
  assert.deepEqual(crmEventsForChange(lead("חדש"), lead("נרשם")), ["qualified", "registered"]);
});

test("a lead moving from בתהליך to נרשם gets only the registration", () => {
  assert.deepEqual(crmEventsForChange(lead("בתהליך"), lead("נרשם")), ["registered"]);
});

test("a repeat of נרשם, such as a payment update, produces nothing", () => {
  assert.deepEqual(crmEventsForChange(lead("נרשם"), lead("נרשם")), []);
});

test("a rating rising from 3 to 4 qualifies a lead; a rating of 3 alone does not", () => {
  assert.deepEqual(crmEventsForChange(lead("חדש", 3), lead("חדש", 4)), ["qualified"]);
  assert.deepEqual(crmEventsForChange(lead("חדש"), lead("חדש", 3)), []);
});

test("leaving qualification never sends an event", () => {
  assert.deepEqual(crmEventsForChange(lead("בתהליך"), lead("לא מעוניין")), []);
});

test("no stored row counts as חדש with no rating", () => {
  assert.deepEqual(crmEventsForChange(undefined, lead("בתהליך")), ["qualified"]);
  assert.deepEqual(crmEventsForChange(undefined, lead("חדש")), []);
});
