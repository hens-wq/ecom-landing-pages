import assert from "node:assert/strict";
import { test } from "node:test";

import { buildLeadQualityReport } from "@/lib/lead-quality";
import { studentRatingCooperation, summarizeStudentRatings } from "@/lib/lead-quality/student-rating";
import type { LeadFact } from "@/lib/performance/types";
import type { Campaign } from "@/lib/types";

function lead(id: string, studentRating: number | null | undefined, overrides: Partial<LeadFact> = {}): LeadFact {
  return {
    id, studentRating, sourceType: "meta_standard_form", leadDate: "2026-11-04", campaignId: "c", adSetId: "s", adId: "a",
    statusKnown: true, mainStatus: "חדש", secondaryStatus: "חדש", fullPaymentAmount: null, partialPaymentAmount: null, ...overrides,
  };
}

test("three flames counts as cooperation while remaining ordinary and never a registration", () => {
  const summary = summarizeStudentRatings([lead("three", 3)], 100, true);
  assert.deepEqual(summary.cooperation, { count: 1, percent: 100 });
  assert.equal(summary.ordinary.count, 1);
  assert.equal(summary.excellent.count, 0);
  assert.equal(summary.costPerExcellent, null);
});

test("explicit and default two-flame leads remain in the denominator but never manufacture cooperation", () => {
  const leads = [lead("two", 2), lead("null", null), lead("undefined", undefined), lead("three", 3), lead("four", 4), lead("five", 5)];
  const before = structuredClone(leads);
  const summary = summarizeStudentRatings(leads, 600, true);
  assert.deepEqual(summary.cooperation, { count: 3, percent: 50 });
  assert.equal(summary.byRating["2"].count, 3);
  assert.equal(summary.defaulted?.count, 2);
  assert.equal(summary.ordinary.count, 4);
  assert.equal(summary.excellent.count, 2);
  assert.deepEqual(leads, before, "the reporting metric never changes raw ratings");
});

test("cooperation always uses all incoming leads, including legacy cold and technically unavailable ratings", () => {
  const leads = [lead("three", 3), lead("four", 4), lead("cold", 1), lead("unknown", null, { statusKnown: false }), lead("invalid", 9)];
  const summary = summarizeStudentRatings(leads, 500, true);
  assert.equal(summary.rated.count, 3);
  assert.equal(summary.complete, false);
  assert.deepEqual(summary.cooperation, { count: 2, percent: 40 });
  assert.deepEqual(studentRatingCooperation(summary, leads.length, true), { count: 2, percent: 40 });
});

test("old summaries fall back to ratings 3–5 and recompute percentages from the supplied cohort, not rated leads", () => {
  const summary = summarizeStudentRatings([lead("three", 3), lead("five", 5), lead("unavailable", null, { statusKnown: false })], 300, true);
  delete summary.cooperation;
  assert.deepEqual(studentRatingCooperation(summary, 3, true), { count: 2, percent: 2 / 3 * 100 });
  assert.deepEqual(studentRatingCooperation(summary, 10, true), { count: 2, percent: 20 });
  summary.cooperation = { count: 2, percent: 100 };
  assert.deepEqual(studentRatingCooperation(summary, 10, true), { count: 2, percent: 20 }, "stored percentages are never reused with a different denominator");
});

test("missing, malformed or impossible cooperation data does not become a confirmed zero or fabricated percentage", () => {
  assert.deepEqual(studentRatingCooperation(undefined, 10, true), { count: 0, percent: null });
  assert.deepEqual(studentRatingCooperation(null, 10, true), { count: 0, percent: null });
  const summary = summarizeStudentRatings([lead("five", 5)], 100, true);
  for (const total of [-1, NaN, Infinity, 1.5]) assert.deepEqual(studentRatingCooperation(summary, total, true), { count: 0, percent: null });
  for (const count of [-1, NaN, Infinity, 1.5, 11]) {
    summary.cooperation = { count, percent: 10 };
    assert.deepEqual(studentRatingCooperation(summary, 10, true), { count: 0, percent: null });
  }
  delete summary.cooperation;
  summary.byRating["3"].count = -1;
  assert.deepEqual(studentRatingCooperation(summary, 10, true), { count: 0, percent: null });
  summary.byRating["3"].count = 10;
  assert.deepEqual(studentRatingCooperation(summary, 10, true), { count: 0, percent: null }, "the sum cannot exceed all incoming leads");
});

test("source failure preserves observed cooperation counts and empty cohorts publish no percentage", () => {
  const partial = summarizeStudentRatings([lead("three", 3), lead("four", 4), lead("two", 2)], 300, false);
  assert.deepEqual(partial.cooperation, { count: 2, percent: null });
  assert.deepEqual(studentRatingCooperation(partial, 3, false), { count: 2, percent: null });
  const empty = summarizeStudentRatings([], 0, true);
  assert.deepEqual(empty.cooperation, { count: 0, percent: null });
  assert.deepEqual(studentRatingCooperation(empty, 0, true), { count: 0, percent: null });
});

test("campaign, series and ad cooperation use their own incoming cohorts without changing sales or quality", () => {
  const metrics = { spend: 100, impressions: 1000, reach: 700, linkClicks: 20, leads: 0, sales: 0, revenue: 0 };
  const campaign: Campaign = { id: "c", name: "קמפיין", objective: "Leads", status: "active", adSets: [{ id: "s", name: "סדרה", campaignId: "c", status: "active", ads: [
    { id: "a", name: "מודעה ראשונה", adSetId: "s", status: "active", destinationType: "meta_standard_form", metrics },
    { id: "b", name: "מודעה שנייה", adSetId: "s", status: "active", destinationType: "meta_standard_form", metrics },
  ] }] };
  const report = buildLeadQualityReport({ campaigns: [campaign], range: { since: "2026-11-01", until: "2026-11-07" }, leads: [
    lead("a-three", 3), lead("a-four", 4), lead("a-two", 2), lead("a-default", null), lead("b-five", 5, { adId: "b" }),
    lead("outside", 5, { leadDate: "2026-10-01" }),
  ] });
  const row = report.campaigns[0];
  assert.deepEqual(row.summary.studentRating?.cooperation, { count: 3, percent: 60 });
  assert.deepEqual(row.adSets[0].summary.studentRating?.cooperation, { count: 3, percent: 60 });
  assert.deepEqual(row.ads[0].summary.studentRating?.cooperation, { count: 2, percent: 50 });
  assert.deepEqual(row.ads[1].summary.studentRating?.cooperation, { count: 1, percent: 100 });
  assert.deepEqual(report.totals.summary.studentRating?.cooperation, { count: 3, percent: 60 });
  assert.equal(row.summary.studentRating?.ordinary.count, 3);
  assert.equal(row.summary.studentRating?.excellent.count, 2);
  assert.equal(row.summary.sales.count, 0);
});
