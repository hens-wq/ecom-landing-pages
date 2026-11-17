import assert from "node:assert/strict";
import { test } from "node:test";

import { buildLeadQualityReport } from "@/lib/lead-quality";
import { buildScaleAssessments, type CampaignScaleAssessment } from "@/lib/lead-quality/scale";
import type { LeadFact } from "@/lib/performance/types";
import type { Campaign } from "@/lib/types";

const RANGE = { since: "2026-10-14", until: "2026-11-12" };

function fixture(ratings: Array<number | null>, registrations = 0, spend = 1000) {
  const campaign: Campaign = {
    id: "rating-scale-campaign", name: "קמפיין איכות", objective: "Leads", status: "active",
    budget: { daily: 150, lifetime: null },
    adSets: [{ id: "rating-scale-set", name: "סדרת איכות", campaignId: "rating-scale-campaign", status: "active", ads: [{
      id: "rating-scale-ad", name: "מודעת איכות", adSetId: "rating-scale-set", status: "active", destinationType: "meta_standard_form",
      metrics: { spend, impressions: 1000, reach: 800, linkClicks: 40, leads: 0, sales: 0, revenue: 0 },
    }] }],
  };
  const leads: LeadFact[] = ratings.map((studentRating, index) => ({
    id: `rating-scale-lead-${index}`, sourceType: "meta_standard_form", leadDate: "2026-11-03",
    campaignId: campaign.id, adSetId: "rating-scale-set", adId: "rating-scale-ad", statusKnown: true,
    mainStatus: index < registrations ? "נרשם" : "בתהליך", secondaryStatus: index < registrations ? "נרשם" : "בתהליך",
    studentRating, fullPaymentAmount: null, partialPaymentAmount: null,
  }));
  return { campaign, leads };
}

function budgetPolicy(assessment: CampaignScaleAssessment) {
  const { candidate, status, action, tier, score, cpa, registrations, confidence, dataComplete, increasePercent, budgetMode, budgetTargets } = assessment;
  return { candidate, status, action, tier, score, cpa, registrations, confidence, dataComplete, increasePercent, budgetMode, budgetTargets };
}

test("excellent-rated leads surface a distinct quality review without becoming registrations or budget proposals", () => {
  const { campaign, leads } = fixture([4, 5], 0, 100);
  const report = buildLeadQualityReport({ campaigns: [campaign], leads, range: RANGE });
  const assessment = buildScaleAssessments({ report, campaigns: [campaign], source: "meta" })[0];
  assert.equal(report.campaigns[0].cpl, 50, "even a cheap lead cost is not permission to scale a rating-only signal");
  assert.equal(assessment.studentRating?.excellent.count, 2);
  assert.equal(assessment.studentRating?.excellent.percent, 100);
  assert.equal(assessment.studentRating?.costPerExcellent, 50);
  assert.equal(assessment.candidate, false, "the financial scale candidate flag remains based on actual registrations");
  assert.equal(assessment.status, "review");
  assert.equal(assessment.action, "review");
  assert.equal(assessment.badge.label, "לידים מצוינים");
  assert.equal(assessment.registrations, 0);
  assert.equal(assessment.cpa, null);
  assert.equal(assessment.increasePercent, null);
  assert.deepEqual(assessment.budgetTargets, []);
  assert.equal(assessment.confidence, "limited");
  assert.ok(assessment.reasons.some((reason) => reason.includes("דירוג תלמיד 4–5")));
  assert.ok(assessment.reasons.some((reason) => reason.includes("לא מוצעת הגדלת תקציב")));
  assert.ok(assessment.basis.includes("אינו הרשמה או הכנסה"));
});

test("ordinary ratings, legacy cold ratings and absent ratings do not fabricate an excellent-lead signal", () => {
  for (const ratings of [[2, 3], [1], [null]] as Array<Array<number | null>>) {
    const { campaign, leads } = fixture(ratings);
    const report = buildLeadQualityReport({ campaigns: [campaign], leads, range: RANGE });
    const assessment = buildScaleAssessments({ report, campaigns: [campaign], source: "meta" })[0];
    assert.equal(assessment.studentRating?.excellent.count, 0);
    assert.equal(assessment.candidate, false);
    assert.equal(assessment.status, "none");
    assert.equal(assessment.action, "wait");
    assert.notEqual(assessment.badge.label, "לידים מצוינים");
    assert.deepEqual(assessment.budgetTargets, []);
  }
});

test("observed excellent leads remain a quality review when ratings or lead sources are partial", () => {
  for (const missing of ["rating", "source"] as const) {
    const { campaign, leads } = fixture(missing === "rating" ? [5, null] : [5, 3]);
    if (missing === "rating") leads[1].statusKnown = false;
    const report = buildLeadQualityReport({ campaigns: [campaign], leads, range: RANGE, leadsKnown: missing !== "source" });
    const assessment = buildScaleAssessments({ report, campaigns: [campaign], source: "meta" })[0];
    assert.equal(assessment.studentRating?.excellent.count, 1, missing);
    assert.equal(assessment.studentRating?.complete, false, missing);
    assert.equal(assessment.studentRating?.costPerExcellent, null, missing);
    assert.equal(assessment.status, "review", missing);
    assert.equal(assessment.candidate, false, missing);
    assert.equal(assessment.registrations, 0, missing);
    assert.equal(assessment.confidence, "limited", missing);
    assert.ok(assessment.reasons.some((reason) => reason.includes("לפחות 1 לידים מצוינים")), missing);
    assert.ok(assessment.sampleNote.includes("חלקיים"), missing);
    assert.deepEqual(assessment.budgetTargets, [], missing);
  }
});

test("ordinary default-two leads do not make an excellent-lead cohort incomplete or become registrations", () => {
  const { campaign, leads } = fixture([5, null]);
  const report = buildLeadQualityReport({ campaigns: [campaign], leads, range: RANGE });
  const assessment = buildScaleAssessments({ report, campaigns: [campaign], source: "meta" })[0];
  assert.equal(assessment.studentRating?.ordinary.count, 1);
  assert.equal(assessment.studentRating?.byRating["2"].count, 1);
  assert.equal(assessment.studentRating?.defaulted?.count, 1);
  assert.equal(assessment.studentRating?.excellent.count, 1);
  assert.equal(assessment.studentRating?.complete, true);
  assert.equal(assessment.studentRating?.costPerExcellent, 1000);
  assert.equal(assessment.badge.label, "לידים מצוינים");
  assert.equal(assessment.registrations, 0);
  assert.equal(assessment.candidate, false);
  assert.ok(!assessment.reasons.some((reason) => reason.includes("לפחות 1 לידים מצוינים")));
  assert.deepEqual(assessment.budgetTargets, []);
  assert.equal(leads[1].studentRating, null, "the report does not mutate a raw null to a stored 2");
});

test("student-rating evidence never changes an existing registration scale decision", () => {
  const { campaign, leads } = fixture([4, 5, 5], 3, 3000);
  const report = buildLeadQualityReport({ campaigns: [campaign], leads, range: RANGE });
  const legacyReport = structuredClone(report);
  delete legacyReport.campaigns[0].summary.studentRating;
  const ratingAware = buildScaleAssessments({ report, campaigns: [campaign], source: "meta" })[0];
  const legacy = buildScaleAssessments({ report: legacyReport, campaigns: [campaign], source: "meta" })[0];
  assert.deepEqual(budgetPolicy(ratingAware), budgetPolicy(legacy));
  assert.equal(ratingAware.registrations, 3);
  assert.equal(ratingAware.cpa, 1000);
  assert.equal(ratingAware.increasePercent, 20);
  assert.equal(ratingAware.badge.label, "מועמד לסקייל", "the registration badge takes priority over excellent lead quality");
  assert.equal(ratingAware.studentRating?.excellent.count, 3);
});

test("excellent ratings cannot override an expensive registration cohort or an inactive campaign", () => {
  const expensive = fixture([5], 1, 3500);
  const expensiveReport = buildLeadQualityReport({ campaigns: [expensive.campaign], leads: expensive.leads, range: RANGE });
  const sales = buildScaleAssessments({ report: expensiveReport, campaigns: [expensive.campaign], source: "meta" })[0];
  assert.equal(sales.candidate, true);
  assert.equal(sales.tier, "expensive");
  assert.equal(sales.badge.label, "סקייל לבדיקת כדאיות");
  assert.deepEqual(sales.budgetTargets, []);

  const inactive = fixture([5]);
  inactive.campaign.status = "paused";
  const inactiveReport = buildLeadQualityReport({ campaigns: [inactive.campaign], leads: inactive.leads, range: RANGE, statusFilter: "all" });
  const quality = buildScaleAssessments({ report: inactiveReport, campaigns: [inactive.campaign], source: "meta" })[0];
  assert.equal(quality.status, "review");
  assert.equal(quality.action, "review");
  assert.equal(quality.candidate, false);
  assert.deepEqual(quality.budgetTargets, []);
});

test("demo ratings provide no quality evidence and an older summary without ratings remains compatible", () => {
  const { campaign, leads } = fixture([5]);
  const report = buildLeadQualityReport({ campaigns: [campaign], leads, range: RANGE });
  const demo = buildScaleAssessments({ report, campaigns: [campaign], source: "mock" })[0];
  assert.equal(demo.studentRating, undefined);
  assert.equal(demo.candidate, false);
  assert.equal(demo.status, "unavailable");
  assert.notEqual(demo.badge.label, "לידים מצוינים");
  assert.deepEqual(demo.budgetTargets, []);

  delete report.campaigns[0].summary.studentRating;
  const old = buildScaleAssessments({ report, campaigns: [campaign], source: "meta" })[0];
  assert.equal(old.studentRating, undefined);
  assert.equal(old.status, "none");
  assert.deepEqual(old.budgetTargets, []);
});
