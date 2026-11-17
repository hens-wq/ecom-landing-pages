import assert from "node:assert/strict";
import { test } from "node:test";
import { buildLeadQualityReport } from "@/lib/lead-quality";
import { summarizeStudentRatings } from "@/lib/lead-quality/student-rating";
import { matchesStudentRatingFilter } from "@/lib/leads/student-rating-filter";
import { loadLeadFacts } from "@/lib/performance/load-lead-facts";
import { defaultLeadStatusRecord } from "@/lib/lead-status/types";
import type { LeadFact } from "@/lib/performance/types";
import type { MetaFormLead } from "@/lib/leads/types";
import type { Campaign } from "@/lib/types";

function lead(id: string, rating: number | null | undefined, overrides: Partial<LeadFact> = {}): LeadFact {
  return { id, sourceType: "meta_standard_form", leadDate: "2026-11-04", campaignId: "c", adSetId: "s", adId: "a", statusKnown: true, mainStatus: "חדש", secondaryStatus: "חדש", fullPaymentAmount: null, partialPaymentAmount: null, studentRating: rating, ...overrides };
}
const campaign: Campaign = { id: "c", name: "קורס", status: "active", objective: "Leads", adSets: [
  { id: "s", campaignId: "c", name: "טופס", status: "active", ads: [
    { id: "a", name: "1", adSetId: "s", status: "active", destinationType: "meta_standard_form", metrics: { spend: 600, impressions: 1000, reach: 500, linkClicks: 30, leads: 0, sales: 0, revenue: 0 } },
  ] },
] };
const range = { since: "2026-11-01", until: "2026-11-07" };

test("known null/undefined ratings report as ordinary two flames while percentages use ALL leads", () => {
  const summary = summarizeStudentRatings([lead("1", 1), lead("2", 2), lead("3", 3), lead("4", 4), lead("5", 5), lead("6", null), lead("7", undefined)], 700, true);
  assert.equal(summary.ordinary.count, 4);
  assert.equal(summary.excellent.count, 2);
  assert.equal(summary.cold.count, 1);
  assert.equal(summary.unrated.count, 0);
  assert.equal(summary.rated.count, 7);
  assert.equal(summary.defaulted?.count, 2);
  assert.equal(summary.defaulted?.percent, 2 / 7 * 100);
  assert.equal(summary.excellent.percent, 2 / 7 * 100);
  assert.equal(summary.byRating["3"].count, 1);
  assert.equal(summary.byRating["2"].count, 3);
  assert.equal(summary.costPerExcellent, 350, "ordinary business defaults are part of a fully reportable cohort");
  assert.equal(summary.complete, true);
});

test("known cost requires complete ratings and matched known spend; no excellent leads never divides by zero", () => {
  const leads = [lead("1", 2), lead("2", 3), lead("3", 4), lead("4", 5)];
  assert.equal(summarizeStudentRatings(leads, 600, true).costPerExcellent, 300);
  assert.equal(summarizeStudentRatings(leads, 0, true).costPerExcellent, 0);
  assert.equal(summarizeStudentRatings(leads, null, true).costPerExcellent, null);
  assert.equal(summarizeStudentRatings(leads, NaN, true).costPerExcellent, null);
  assert.equal(summarizeStudentRatings(leads, -5, true).costPerExcellent, null);
  assert.equal(summarizeStudentRatings([...leads, lead("default", null)], 600, true).costPerExcellent, 300);
  assert.equal(summarizeStudentRatings([lead("o", 3)], 10, true).costPerExcellent, null);
  assert.equal(summarizeStudentRatings([], 0, true).excellent.percent, null);
});

test("a missing rating during a source outage stays unavailable but explicit valid ratings remain usable", () => {
  const leads = [
    lead("unavailable-null", null, { statusKnown: false }),
    lead("unavailable-undefined", undefined, { statusKnown: false }),
    lead("explicit-ordinary", 2, { statusKnown: false }),
    lead("explicit-excellent", 5, { statusKnown: false }),
    lead("known-default", null),
  ];
  const before = structuredClone(leads);
  const summary = summarizeStudentRatings(leads, 500, true);
  assert.equal(summary.unrated.count, 2);
  assert.equal(summary.ordinary.count, 2);
  assert.equal(summary.excellent.count, 1);
  assert.equal(summary.rated.count, 3);
  assert.equal(summary.defaulted?.count, 1);
  assert.equal(summary.byRating["2"].count, 2);
  assert.equal(summary.excellent.percent, 20);
  assert.equal(summary.complete, false);
  assert.equal(summary.costPerExcellent, null);
  assert.deepEqual(leads, before, "effective reporting never replaces the raw CRM value");
});

test("unknown source coverage hides rates and cost but preserves observed ratings; invalid raw codes never become flames", () => {
  const summary = summarizeStudentRatings([lead("a", 4), lead("b", 9), lead("c", 3.5), lead("d", 0)], 400, false);
  assert.equal(summary.excellent.count, 1);
  assert.equal(summary.excellent.percent, null);
  assert.equal(summary.unrated.count, 3);
  assert.equal(summary.costPerExcellent, null);
  assert.equal(summary.complete, false);
});

test("ratings aggregate by campaign/set/ad identity and stay independent from red reasons and sales", () => {
  const report = buildLeadQualityReport({ campaigns: [campaign], range, leads: [
    lead("red-excellent", 4, { mainStatus: "ליד שגוי", secondaryStatus: "ליד שגוי - חשב/ה מדובר בעבודה" }),
    lead("new-excellent", 5), lead("ordinary", 3),
    lead("outside", 5, { leadDate: "2026-10-01" }),
  ] });
  for (const row of [report.campaigns[0], report.campaigns[0].adSets[0], report.campaigns[0].ads[0], report.totals]) {
    assert.equal(row.totalLeads, 3);
    assert.equal(row.summary.studentRating?.excellent.count, 2);
    assert.equal(row.summary.studentRating?.excellent.percent, 2 / 3 * 100);
    assert.equal(row.summary.studentRating?.costPerExcellent, 300);
    assert.equal(row.summary.sales.count, 0, "an excellent lead is never an enrollment");
    assert.equal(row.summary.irrelevant.count, 1, "flames do not rewrite the CRM reason");
  }
  assert.equal(report.diagnostics.outsideRangeLeads, 1);
});

test("lead filters treat known missing ratings as ordinary without accidentally hiding legacy cold in All", () => {
  for (const rating of [2, 3, null, undefined]) {
    assert.equal(matchesStudentRatingFilter(rating, "ordinary"), true);
    assert.equal(matchesStudentRatingFilter(rating, "excellent"), false);
  }
  for (const rating of [4, 5]) assert.equal(matchesStudentRatingFilter(rating, "excellent"), true);
  for (const rating of [null, undefined]) assert.equal(matchesStudentRatingFilter(rating, "unrated"), false);
  for (const rating of [9, 3.5]) assert.equal(matchesStudentRatingFilter(rating, "unrated"), true);
  assert.equal(matchesStudentRatingFilter(1, null), true);
  assert.equal(matchesStudentRatingFilter(1, "ordinary"), false);
  assert.equal(matchesStudentRatingFilter(1, "unrated"), false);
});

test("raw fact loading preserves null provenance while reporting defaults only successfully read missing ratings", async () => {
  const metaLead = (id: string): MetaFormLead => ({ id, createdTime: "2026-11-04T08:00:00Z", name: null, phone: null, normalizedPhone: null, email: null, formId: "f", campaignId: "c", campaignName: "קורס", adSetId: "s", adSetName: "טופס", adId: "a", adName: "1", sourceType: "meta_standard_form" });
  const sources = {
    readMetaLeads: async () => [metaLead("known"), metaLead("unsynced")],
    readLandingLeads: async () => [],
    readStatuses: async () => new Map([["known", { ...defaultLeadStatusRecord("known", null), studentRating: 5 }]]),
  };
  const result = await loadLeadFacts(range, sources);
  assert.equal(result.leads.find((row) => row.id === "known")?.studentRating, 5);
  assert.equal(result.leads.find((row) => row.id === "unsynced")?.studentRating, null);
  const effective = summarizeStudentRatings(result.leads, 200, true);
  assert.equal(effective.ordinary.count, 1);
  assert.equal(effective.byRating["2"].count, 1);
  assert.equal(effective.defaulted?.count, 1);
  assert.equal(effective.complete, true);
  const failed = await loadLeadFacts(range, { ...sources, readStatuses: async () => { throw new Error("offline"); } });
  assert.ok(failed.leads.every((row) => row.studentRating === null));
  assert.equal(failed.sources.statuses.state, "unavailable");
  const unavailable = summarizeStudentRatings(failed.leads, 200, true);
  assert.equal(unavailable.unrated.count, 2);
  assert.equal(unavailable.ordinary.count, 0);
  assert.equal(unavailable.defaulted?.count, 0);
  assert.equal(unavailable.complete, false);
});
