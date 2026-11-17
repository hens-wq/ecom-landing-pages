import assert from "node:assert/strict";
import { test } from "node:test";

import { addDaysIso, inclusiveDayCount, planPeriods } from "@/lib/optimization/periods";

const TODAY = "2026-11-03";

test("a 7-day selection that includes today compares six complete days with the six days before them", () => {
  const plan = planPeriods({ since: "2026-10-28", until: "2026-11-03" }, TODAY);
  assert.equal(plan.selectedDays, 7);
  assert.equal(plan.selectedPartial, true);
  assert.deepEqual(plan.trendCurrent, { since: "2026-10-28", until: "2026-11-02" });
  assert.deepEqual(plan.trendPrevious, { since: "2026-10-22", until: "2026-10-27" });
  assert.equal(plan.completeDates.length, 6, "today is never a complete day");
  assert.match(plan.trendNote, /היום נכלל כיום חלקי/);
});

test("the previous period has the same length as the current one and sits directly before it, without overlap", () => {
  const ranges = [
    { since: "2026-10-05", until: "2026-11-03" },
    { since: "2026-11-01", until: "2026-11-03" },
    { since: "2026-11-02", until: "2026-11-03" },
    { since: "2026-10-01", until: "2026-10-10" },
    { since: "2026-09-01", until: "2026-09-30" },
  ];
  for (const range of ranges) {
    const plan = planPeriods(range, TODAY);
    assert.ok(plan.trendCurrent && plan.trendPrevious, `${range.since}..${range.until} has a trend window`);
    assert.equal(inclusiveDayCount(plan.trendPrevious), inclusiveDayCount(plan.trendCurrent), "same length");
    assert.equal(addDaysIso(plan.trendPrevious.until, 1), plan.trendCurrent.since, "directly before, no gap, no overlap");
  }
});

test("a selection that is only today has no complete day, so no trend is shown", () => {
  const plan = planPeriods({ since: TODAY, until: TODAY }, TODAY);
  assert.equal(plan.selectedPartial, true);
  assert.equal(plan.trendCurrent, null);
  assert.equal(plan.trendPrevious, null);
  assert.equal(plan.completeDates.length, 0);
  assert.match(plan.trendNote, /אין ימים מלאים/);
});

test("a past range is complete, so the trend covers the whole selection", () => {
  const plan = planPeriods({ since: "2026-11-02", until: "2026-11-02" }, TODAY);
  assert.equal(plan.selectedPartial, false);
  assert.deepEqual(plan.trendCurrent, { since: "2026-11-02", until: "2026-11-02" });
  assert.deepEqual(plan.trendPrevious, { since: "2026-11-01", until: "2026-11-01" });
});

test("today and yesterday: yesterday is compared with the day before it", () => {
  const plan = planPeriods({ since: "2026-11-02", until: "2026-11-03" }, TODAY);
  assert.deepEqual(plan.trendCurrent, { since: "2026-11-02", until: "2026-11-02" });
  assert.deepEqual(plan.trendPrevious, { since: "2026-11-01", until: "2026-11-01" });
});

test("the current month keeps the same rule: the complete days from the 1st, compared with the same count before", () => {
  const plan = planPeriods({ since: "2026-11-01", until: "2026-11-03" }, TODAY);
  assert.deepEqual(plan.trendCurrent, { since: "2026-11-01", until: "2026-11-02" });
  assert.deepEqual(plan.trendPrevious, { since: "2026-10-30", until: "2026-10-31" });
});

test("a range that lies entirely in the future has no complete day", () => {
  const plan = planPeriods({ since: "2026-11-05", until: "2026-11-07" }, TODAY);
  assert.equal(plan.selectedPartial, true);
  assert.equal(plan.trendCurrent, null);
});

test("the complete dates run from the first day to yesterday, in order, with no gaps", () => {
  const plan = planPeriods({ since: "2026-10-28", until: "2026-11-03" }, TODAY);
  assert.equal(plan.completeDates[0], "2026-10-28");
  assert.equal(plan.completeDates[plan.completeDates.length - 1], "2026-11-02");
  for (let index = 1; index < plan.completeDates.length; index += 1) {
    assert.equal(plan.completeDates[index], addDaysIso(plan.completeDates[index - 1], 1));
  }
});
