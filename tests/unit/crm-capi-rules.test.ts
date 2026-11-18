import assert from "node:assert/strict";
import { test } from "node:test";

import {
  QUALIFIED_MAIN_STATUSES,
  QUALIFIED_SECONDARY_STATUSES,
  crmEventsForChange,
  isQualified,
  isRegistered,
  type LeadQualitySnapshot,
} from "@/lib/crm-capi/rules";
import { MAIN_STATUSES, SECONDARY_STATUSES_BY_MAIN, type MainStatus } from "@/lib/lead-status/types";

// The secondary status defaults to the main status, which is how a single-option status is stored.
const lead = (mainStatus: string, studentRating: number | null = null, secondaryStatus = mainStatus): LeadQualitySnapshot => ({
  mainStatus,
  secondaryStatus,
  studentRating,
});

const FUTURE = 'ל"מ - פוטנציאל עתידי';
const STOPPED = 'ל"מ - הפסיק באמצע תהליך';
const PRICE = 'ל"מ - מחיר יקר';
const CANCEL_BDI = "ביטל הרשמה - BDI שלילי";
const CANCEL_CHANGED = "ביטל הרשמה - לקוח התחרט";

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
  assert.equal(isRegistered(lead("ביטול הרשמה", null, CANCEL_BDI)), false);
  assert.equal(isRegistered(lead("לא מעוניין", null, FUTURE)), false);
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

test("the qualifying statuses are spelled exactly as in the dashboard's own status lists", () => {
  const mainStatuses = MAIN_STATUSES as readonly string[];
  const secondariesByMain = SECONDARY_STATUSES_BY_MAIN as Readonly<Record<string, readonly string[]>>;
  for (const mainStatus of QUALIFIED_MAIN_STATUSES) {
    assert.ok(mainStatuses.includes(mainStatus), `main status "${mainStatus}" is not in the dashboard`);
  }
  for (const rule of QUALIFIED_SECONDARY_STATUSES) {
    assert.ok(mainStatuses.includes(rule.mainStatus), `main status "${rule.mainStatus}" is not in the dashboard`);
    assert.ok(
      (secondariesByMain[rule.mainStatus] ?? []).includes(rule.secondaryStatus),
      `secondary status "${rule.secondaryStatus}" is not under "${rule.mainStatus}" in the dashboard`
    );
  }
});

test("ביטול הרשמה qualifies a lead whatever its secondary status", () => {
  assert.equal(isQualified(lead("ביטול הרשמה", null, CANCEL_BDI)), true);
  assert.equal(isQualified(lead("ביטול הרשמה", null, CANCEL_CHANGED)), true);
  for (const secondary of SECONDARY_STATUSES_BY_MAIN["ביטול הרשמה"]) {
    assert.equal(isQualified(lead("ביטול הרשמה", null, secondary)), true, secondary);
  }
});

test("לא מעוניין qualifies only its two named reasons, never the whole category", () => {
  assert.equal(isQualified(lead("לא מעוניין", null, FUTURE)), true);
  assert.equal(isQualified(lead("לא מעוניין", null, STOPPED)), true);
  for (const secondary of SECONDARY_STATUSES_BY_MAIN["לא מעוניין"]) {
    if (secondary === FUTURE || secondary === STOPPED) continue;
    assert.equal(isQualified(lead("לא מעוניין", null, secondary)), false, secondary);
  }
});

test("a rating of 4 or 5 still qualifies a not-interested lead, and a rating of 3 does not", () => {
  assert.equal(isQualified(lead("לא מעוניין", 4, PRICE)), true);
  assert.equal(isQualified(lead("לא מעוניין", 3, PRICE)), false);
});

test("the other main statuses stay unqualified, whatever their secondary status", () => {
  for (const mainStatus of ["ליד שגוי", "רשימה שחורה", "אין מענה", "DATA"]) {
    for (const secondary of SECONDARY_STATUSES_BY_MAIN[mainStatus as MainStatus]) {
      assert.equal(isQualified(lead(mainStatus, null, secondary)), false, `${mainStatus} / ${secondary}`);
    }
  }
});

test("a lead that cancels its registration qualifies once; a later registration sends only the registration", () => {
  assert.deepEqual(crmEventsForChange(lead("חדש"), lead("ביטול הרשמה", null, CANCEL_BDI)), ["qualified"]);
  assert.deepEqual(crmEventsForChange(lead("ביטול הרשמה", null, CANCEL_BDI), lead("ביטול הרשמה", null, CANCEL_CHANGED)), []);
  assert.deepEqual(crmEventsForChange(lead("נרשם"), lead("ביטול הרשמה", null, CANCEL_BDI)), []);
  assert.deepEqual(crmEventsForChange(lead("ביטול הרשמה", null, CANCEL_CHANGED), lead("נרשם")), ["registered"]);
});

test("a not-interested lead with future potential qualifies once; leaving that reason sends nothing", () => {
  assert.deepEqual(crmEventsForChange(lead("לא מעוניין", null, PRICE), lead("לא מעוניין", null, FUTURE)), ["qualified"]);
  assert.deepEqual(crmEventsForChange(lead("לא מעוניין", null, FUTURE), lead("בתהליך")), []);
  assert.deepEqual(crmEventsForChange(lead("לא מעוניין", null, FUTURE), lead("לא מעוניין", null, STOPPED)), []);
  assert.deepEqual(crmEventsForChange(lead("לא מעוניין", null, FUTURE), lead("לא מעוניין", null, PRICE)), []);
});

test("the stopped-midway reason qualifies a lead, and no status of its own registers it", () => {
  assert.deepEqual(crmEventsForChange(lead("חדש"), lead("לא מעוניין", null, STOPPED)), ["qualified"]);
  assert.equal(isRegistered(lead("לא מעוניין", null, STOPPED)), false);
});

test("returning to a qualifying reason asks for a qualified event again; the outbox keeps one row per lead", () => {
  assert.deepEqual(crmEventsForChange(lead("לא מעוניין", null, PRICE), lead("לא מעוניין", null, FUTURE)), ["qualified"]);
});
