import assert from "node:assert/strict";
import { test } from "node:test";

import { buildLeadQualityReport } from "@/lib/lead-quality";
import { buildScaleAssessments, SCALE_COHORT_BASIS, type ScaleCampaign } from "@/lib/lead-quality/scale";
import type { LeadFact } from "@/lib/performance/types";
import type { EntityStatus } from "@/lib/types";

const RANGE = { since: "2026-10-13", until: "2026-11-11" };
function campaign(spend = 1000, registrations = 1, status: EntityStatus = "active"): { campaign: ScaleCampaign; leads: LeadFact[] } {
  const source: ScaleCampaign = {
    id: "scale-campaign", name: "קמפיין קורס לבדיקה", objective: "Leads", status,
    budget: { daily: 150, lifetime: null },
    adSets: [{
      id: "scale-set", name: "סדרת קורס לבדיקה", campaignId: "scale-campaign", status,
      budget: { daily: null, lifetime: null },
      ads: [{ id: "scale-ad", name: "מודעת בדיקה", adSetId: "scale-set", status, destinationType: "meta_standard_form", metrics: { spend, impressions: 5000, reach: 3000, linkClicks: 100, leads: 0, sales: 0, revenue: 0 } }],
    }],
  };
  const leads: LeadFact[] = Array.from({ length: Math.max(registrations, 1) }, (_, index) => ({
    id: `scale-lead-${index}`, sourceType: "meta_standard_form", leadDate: "2026-11-03", campaignId: source.id,
    adSetId: "scale-set", adId: "scale-ad", statusKnown: true,
    mainStatus: index < registrations ? "נרשם" : "חדש", secondaryStatus: index < registrations ? "נרשם" : "חדש",
    fullPaymentAmount: null, partialPaymentAmount: null,
  }));
  return { campaign: source, leads };
}
function assess(spend = 1000, registrations = 1) {
  const fixture = campaign(spend, registrations);
  const report = buildLeadQualityReport({ campaigns: [fixture.campaign], leads: fixture.leads, range: RANGE });
  return buildScaleAssessments({ report, campaigns: [fixture.campaign], source: "meta" })[0];
}

test("one registration already qualifies and proposes a cautious ten-percent daily increase", () => {
  const assessment = assess(1000, 1);
  assert.equal(assessment.candidate, true);
  assert.equal(assessment.status, "candidate");
  assert.equal(assessment.registrations, 1);
  assert.equal(assessment.cpa, 1000);
  assert.equal(assessment.increasePercent, 10);
  assert.equal(assessment.confidence, "limited");
  assert.equal(assessment.budgetMode, "campaign_daily");
  assert.deepEqual(assessment.budgetTargets, [{ id: "scale-campaign", level: "campaign", name: "קמפיין קורס לבדיקה", currentDaily: 150, proposedDaily: 165, increaseDaily: 15, increasePercent: 10 }]);
});

test("CPA band boundaries are inclusive, with twenty percent reserved for excellent CPA and three registrations", () => {
  const excellentThree = assess(4500, 3);
  assert.equal(excellentThree.cpa, 1500);
  assert.equal(excellentThree.tier, "excellent");
  assert.equal(excellentThree.increasePercent, 20);
  assert.equal(excellentThree.confidence, "moderate");
  assert.equal(excellentThree.budgetTargets[0].proposedDaily, 180);
  assert.equal(assess(3000, 2).increasePercent, 10, "two registrations remain cautious even at excellent CPA");
  assert.equal(assess(1500.01, 1).tier, "reasonable");
  assert.equal(assess(9000, 3).increasePercent, 10, "CPA exactly 3,000 is still eligible");
  const expensive = assess(3000.01, 1);
  assert.equal(expensive.candidate, true, "higher CPA does not erase an observed registration");
  assert.equal(expensive.status, "review");
  assert.equal(expensive.tier, "expensive");
  assert.equal(expensive.increasePercent, null);
  assert.deepEqual(expensive.budgetTargets, []);
  assert.equal(expensive.budgetMode, "campaign_daily", "an economic review must not misreport a known daily budget as missing");
});

test("no registrations is not yet a candidate; incomplete sources show unavailable rather than a false verdict", () => {
  const fixture = campaign(1000, 0);
  const report = buildLeadQualityReport({ campaigns: [fixture.campaign], leads: fixture.leads, range: RANGE });
  const complete = buildScaleAssessments({ report, campaigns: [fixture.campaign] })[0];
  assert.equal(complete.candidate, false);
  assert.equal(complete.status, "none");
  assert.deepEqual(complete.budgetTargets, []);
  const incompleteReport = buildLeadQualityReport({ campaigns: [fixture.campaign], leads: [], range: RANGE, leadsKnown: false });
  const incomplete = buildScaleAssessments({ report: incompleteReport, campaigns: [fixture.campaign] })[0];
  assert.equal(incomplete.status, "unavailable");
  assert.equal(incomplete.cpa, null);
});

test("enrolment and payment variants are the same registration evidence, without requiring revenue", () => {
  const fixture = campaign(3000, 3);
  fixture.leads[1].secondaryStatus = "תשלום חלקי";
  fixture.leads[2].secondaryStatus = "תשלום מלא";
  const report = buildLeadQualityReport({ campaigns: [fixture.campaign], leads: fixture.leads, range: RANGE });
  const assessment = buildScaleAssessments({ report, campaigns: [fixture.campaign] })[0];
  assert.equal(assessment.registrations, 3);
  assert.equal(assessment.cpa, 1000);
  assert.equal(assessment.increasePercent, 20);
  assert.equal(report.campaigns[0].summary.revenue, 0, "missing payment amounts do not invalidate enrolled leads");
});

test("known registrations remain candidates when lead sources or statuses are incomplete, but numeric raises are suppressed", () => {
  for (const state of ["source", "unknown-status", "unmapped-status"] as const) {
    const fixture = campaign(1000, 1);
    if (state !== "source") fixture.leads.push({ ...fixture.leads[0], id: "uncertain", mainStatus: "לא מעוניין", secondaryStatus: state === "unmapped-status" ? "סיבה חדשה שטרם מופתה" : "חדש", statusKnown: state !== "unknown-status" });
    const report = buildLeadQualityReport({ campaigns: [fixture.campaign], leads: fixture.leads, range: RANGE, leadsKnown: state !== "source" });
    const assessment = buildScaleAssessments({ report, campaigns: [fixture.campaign] })[0];
    assert.equal(assessment.candidate, true, state);
    assert.equal(assessment.registrations, 1, state);
    assert.equal(assessment.status, "review", state);
    assert.equal(assessment.dataComplete, false, state);
    assert.equal(assessment.increasePercent, null, state);
    assert.deepEqual(assessment.budgetTargets, [], state);
  }
});

test("unlisted spend and a non-fixed window prevent numeric recommendations", () => {
  const fixture = campaign(1000, 1);
  const report = buildLeadQualityReport({ campaigns: [fixture.campaign], leads: fixture.leads, range: RANGE });
  for (const input of [
    { report, campaigns: [fixture.campaign], hasUnlistedSpend: true },
    { report: { ...report, unlistedSpend: 10 }, campaigns: [fixture.campaign], hasUnlistedSpend: false },
    { report: { ...report, range: { since: "2026-11-01", until: "2026-11-11" } }, campaigns: [fixture.campaign] },
  ]) {
    const assessment = buildScaleAssessments(input)[0];
    assert.equal(assessment.candidate, true);
    assert.equal(assessment.status, "review");
    assert.equal(assessment.increasePercent, null);
    assert.deepEqual(assessment.budgetTargets, []);
  }
});

test("zero, missing, negative and non-finite spend never become zero-CPA budget increases", () => {
  const fixture = campaign(1000, 1);
  const report = buildLeadQualityReport({ campaigns: [fixture.campaign], leads: fixture.leads, range: RANGE });
  for (const spend of [0, null, -1, NaN, Infinity]) {
    const row = { ...report.campaigns[0], spend };
    const assessment = buildScaleAssessments({ report: { ...report, campaigns: [row] }, campaigns: [fixture.campaign] })[0];
    assert.equal(assessment.candidate, true);
    assert.equal(assessment.status, "review");
    assert.equal(assessment.cpa, null);
    assert.deepEqual(assessment.budgetTargets, []);
  }
});

test("inactive campaigns remain reactivation-review candidates without any budget increase", () => {
  for (const status of ["paused", "ended"] as const) {
    const fixture = campaign(1000, 1, status);
    const report = buildLeadQualityReport({ campaigns: [fixture.campaign], leads: fixture.leads, range: RANGE, statusFilter: "all" });
    const assessment = buildScaleAssessments({ report, campaigns: [fixture.campaign] })[0];
    assert.equal(assessment.candidate, true);
    assert.equal(assessment.action, "reactivate_review");
    assert.equal(assessment.status, "review");
    assert.equal(assessment.increasePercent, null);
    assert.deepEqual(assessment.budgetTargets, []);
  }
});

test("lifetime or missing budget retains candidacy without inventing a daily amount from spend", () => {
  for (const budget of [undefined, { daily: null, lifetime: null }, { daily: 0, lifetime: 0 }, { daily: null, lifetime: 9000 }]) {
    const fixture = campaign(1000, 1);
    fixture.campaign.budget = budget;
    const report = buildLeadQualityReport({ campaigns: [fixture.campaign], leads: fixture.leads, range: RANGE });
    const assessment = buildScaleAssessments({ report, campaigns: [fixture.campaign] })[0];
    assert.equal(assessment.candidate, true);
    assert.equal(assessment.status, "candidate");
    assert.equal(assessment.action, "review");
    assert.equal(assessment.increasePercent, null);
    assert.deepEqual(assessment.budgetTargets, []);
  }
});

test("invalid or conflicting budget metadata cannot produce a numeric increase", () => {
  for (const budget of [{ daily: -1, lifetime: null }, { daily: Infinity, lifetime: null }, { daily: 150, lifetime: 9000 }]) {
    const fixture = campaign(1000, 1);
    fixture.campaign.budget = budget;
    const report = buildLeadQualityReport({ campaigns: [fixture.campaign], leads: fixture.leads, range: RANGE });
    const assessment = buildScaleAssessments({ report, campaigns: [fixture.campaign] })[0];
    assert.equal(assessment.candidate, true);
    assert.equal(assessment.status, "review");
    assert.deepEqual(assessment.budgetTargets, []);
  }
});

test("ABO proposes only active winning ad sets using their own CPA, samples and actual daily budgets", () => {
  const fixture = campaign(3000, 3);
  fixture.campaign.budget = { daily: 0, lifetime: null };
  fixture.campaign.adSets[0].budget = { daily: 99.99, lifetime: null };
  const extra = [
    { id: "one-sale", spend: 2000, registrations: 1, status: "active" as const, daily: 50 },
    { id: "paused-winner", spend: 100, registrations: 1, status: "paused" as const, daily: 200 },
    { id: "no-sales", spend: 100, registrations: 0, status: "active" as const, daily: 100 },
    { id: "expensive", spend: 4000, registrations: 1, status: "active" as const, daily: 90 },
  ];
  for (const set of extra) {
    fixture.campaign.adSets.push({ id: set.id, name: set.id, campaignId: fixture.campaign.id, status: set.status, budget: { daily: set.daily, lifetime: null }, ads: [{ id: `ad-${set.id}`, name: set.id, adSetId: set.id, status: set.status, destinationType: "unknown", metrics: { spend: set.spend, impressions: 100, reach: 80, linkClicks: 10, leads: 0, sales: 0, revenue: 0 } }] });
    for (let index = 0; index < Math.max(set.registrations, 1); index++) fixture.leads.push({ ...fixture.leads[0], id: `lead-${set.id}-${index}`, adSetId: set.id, adId: `ad-${set.id}`, mainStatus: index < set.registrations ? "נרשם" : "חדש", secondaryStatus: index < set.registrations ? "נרשם" : "חדש" });
  }
  const report = buildLeadQualityReport({ campaigns: [fixture.campaign], leads: fixture.leads, range: RANGE });
  const assessment = buildScaleAssessments({ report, campaigns: [fixture.campaign] })[0];
  assert.equal(assessment.candidate, true);
  assert.equal(assessment.budgetMode, "adset_daily");
  assert.deepEqual(assessment.budgetTargets.map((target) => target.id), ["scale-set", "one-sale"]);
  assert.equal(assessment.budgetTargets[0].increasePercent, 20);
  assert.equal(assessment.budgetTargets[0].currentDaily, 99.99);
  assert.equal(assessment.budgetTargets[0].proposedDaily, 119.99);
  assert.equal(assessment.budgetTargets[1].increasePercent, 10);
  assert.equal(assessment.budgetTargets[1].proposedDaily, 55);
  assert.equal(assessment.increasePercent, null, "different set proposals are not misrepresented as one campaign-wide percentage");
});

test("ABO without an eligible winning daily set offers no fake campaign-level increase", () => {
  const fixture = campaign(1000, 1);
  fixture.campaign.budget = { daily: null, lifetime: null };
  fixture.campaign.adSets[0].budget = { daily: null, lifetime: 5000 };
  const report = buildLeadQualityReport({ campaigns: [fixture.campaign], leads: fixture.leads, range: RANGE });
  const assessment = buildScaleAssessments({ report, campaigns: [fixture.campaign] })[0];
  assert.equal(assessment.candidate, true);
  assert.equal(assessment.budgetMode, "lifetime");
  assert.deepEqual(assessment.budgetTargets, []);
  assert.equal(assessment.increasePercent, null);
});

test("cohort basis and independent fixed dates are explicit, and recommendations never mutate inputs", () => {
  const fixture = campaign(1000, 1);
  const report = buildLeadQualityReport({ campaigns: [fixture.campaign], leads: fixture.leads, range: RANGE });
  const input = { report, campaigns: [fixture.campaign] };
  const before = structuredClone(input);
  const assessment = buildScaleAssessments(input)[0];
  assert.deepEqual(assessment.range, RANGE);
  assert.equal(assessment.basis, SCALE_COHORT_BASIS);
  assert.ok(assessment.basis.includes("נקלטו"));
  assert.ok(assessment.basis.includes("אינו לפי תאריך"));
  assert.deepEqual(input, before);
});


test("demonstration data never flags a campaign as a real scale candidate", () => {
  const fixture = campaign(1000, 1);
  const report = buildLeadQualityReport({ campaigns: [fixture.campaign], leads: fixture.leads, range: RANGE });
  const assessment = buildScaleAssessments({ report, campaigns: [fixture.campaign], source: "mock" })[0];
  assert.equal(assessment.registrations, 1);
  assert.equal(assessment.candidate, false);
  assert.equal(assessment.status, "unavailable");
  assert.equal(assessment.confidence, "limited");
  assert.equal(assessment.increasePercent, null);
  assert.deepEqual(assessment.budgetTargets, []);
  assert.ok(assessment.reasons.some((reason) => reason.includes("הדגמה")));
});

test("an active CBO campaign without an active set and active ad is review-only", () => {
  for (const inactivePart of ["set", "ad", "empty-set"] as const) {
    const fixture = campaign(1000, 1);
    if (inactivePart === "set") fixture.campaign.adSets[0].status = "paused";
    if (inactivePart === "ad") fixture.campaign.adSets[0].ads[0].status = "paused";
    if (inactivePart === "empty-set") fixture.campaign.adSets.push({ id: "empty-active", name: "סדרה פעילה ריקה", campaignId: fixture.campaign.id, status: "active", ads: [] });
    if (inactivePart === "empty-set") fixture.campaign.adSets[0].status = "paused";
    const report = buildLeadQualityReport({ campaigns: [fixture.campaign], leads: fixture.leads, range: RANGE });
    const assessment = buildScaleAssessments({ report, campaigns: [fixture.campaign] })[0];
    assert.equal(assessment.candidate, true, inactivePart);
    assert.equal(assessment.status, "review", inactivePart);
    assert.equal(assessment.increasePercent, null, inactivePart);
    assert.deepEqual(assessment.budgetTargets, [], inactivePart);
  }
});

test("an ABO winning active set with no active ads does not receive a budget proposal", () => {
  const fixture = campaign(1000, 1);
  fixture.campaign.budget = { daily: null, lifetime: null };
  fixture.campaign.adSets[0].budget = { daily: 100, lifetime: null };
  fixture.campaign.adSets[0].ads[0].status = "paused";
  const report = buildLeadQualityReport({ campaigns: [fixture.campaign], leads: fixture.leads, range: RANGE });
  const assessment = buildScaleAssessments({ report, campaigns: [fixture.campaign] })[0];
  assert.equal(assessment.candidate, true);
  assert.equal(assessment.budgetMode, "adset_daily");
  assert.equal(assessment.action, "review");
  assert.equal(assessment.increasePercent, null);
  assert.deepEqual(assessment.budgetTargets, []);
});

test("three observed registrations with incomplete data never claim moderate evidence", () => {
  const fixture = campaign(1000, 3);
  const report = buildLeadQualityReport({ campaigns: [fixture.campaign], leads: fixture.leads, range: RANGE, leadsKnown: false });
  const assessment = buildScaleAssessments({ report, campaigns: [fixture.campaign] })[0];
  assert.equal(assessment.candidate, true);
  assert.equal(assessment.confidence, "limited");
  assert.ok(!assessment.sampleNote.includes("בינונית"));
  assert.deepEqual(assessment.budgetTargets, []);
});
