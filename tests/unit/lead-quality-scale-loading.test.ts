import assert from "node:assert/strict";
import { test } from "node:test";

import { loadScaleAnalysis, type ScaleAnalysisSources } from "@/lib/lead-quality/load-scale";
import type { AdvertisingSnapshot, DateRange } from "@/lib/advertising/types";
import type { LeadFact, LeadFactsResult } from "@/lib/performance/types";
import type { Campaign } from "@/lib/types";

const NOW = new Date("2026-11-11T09:00:00Z");
const RANGE = { since: "2026-10-13", until: "2026-11-11" };
const campaign: Campaign = {
  id: "scale-loader-course", name: "קורס", objective: "Leads", status: "active", budget: { daily: 150, lifetime: null },
  adSets: [{ id: "set", name: "סדרה", campaignId: "scale-loader-course", status: "active", ads: [{
    id: "ad", name: "1", adSetId: "set", status: "active", destinationType: "meta_standard_form",
    metrics: { spend: 1000, impressions: 1000, reach: 800, linkClicks: 50, leads: 0, sales: 0, revenue: 0 },
  }] }],
};

function lead(id: string, leadDate: string, overrides: Partial<LeadFact> = {}): LeadFact {
  return { id, leadDate, campaignId: campaign.id, adSetId: "set", adId: "ad", sourceType: "meta_standard_form", statusKnown: true, mainStatus: "נרשם", secondaryStatus: "נרשם", fullPaymentAmount: null, partialPaymentAmount: null, ...overrides };
}

function snapshot(): AdvertisingSnapshot {
  return { campaigns: [campaign], excludedCampaigns: [], excludedSpend: 0, unlisted: null };
}

function facts(leads: LeadFact[]): LeadFactsResult {
  return { ...RANGE, leads, sources: { meta: { state: "ok", message: null }, landing: { state: "ok", message: null }, statuses: { state: "ok", unknownCount: 0, message: null } } };
}

function sources(overrides: Partial<ScaleAnalysisSources> = {}): ScaleAnalysisSources {
  return { source: "meta", readCampaigns: async () => snapshot(), readLeadFacts: async () => facts([lead("one", RANGE.since)]), ...overrides };
}

test("scale always reads the same server-resolved 30-day Israel window for spend and lead cohorts, including both edges", async () => {
  const requested: DateRange[] = [];
  const result = await loadScaleAnalysis(NOW, sources({
    readCampaigns: async (range) => { requested.push(range); return snapshot(); },
    readLeadFacts: async (range) => { requested.push(range); return facts([lead("first", RANGE.since), lead("today", RANGE.until), lead("outside", "2026-10-12")]); },
  }));
  assert.deepEqual(requested, [RANGE, RANGE]);
  assert.deepEqual(result.metadata.range, RANGE);
  assert.equal(result.assessments[0].registrations, 2);
  assert.equal(result.assessments[0].cpa, 500);
  assert.equal(result.assessments[0].candidate, true);
  assert.equal(result.assessments[0].budgetTargets[0].currentDaily, 150);
  assert.equal(result.assessments[0].budgetTargets[0].proposedDaily, 165);
  assert.equal(result.assessments[0].adClosures?.[0].closures, 2, "the compact fixed-window ad data is returned with the campaign assessment");
});

test("the rolling window follows the Israel calendar at a UTC-date boundary", async () => {
  const result = await loadScaleAnalysis(new Date("2026-11-10T22:30:00Z"), sources());
  assert.deepEqual(result.metadata.range, RANGE);
});

test("a partial lead source keeps observed registrations as a review candidate and withholds numerical budget proposals", async () => {
  const partial = facts([lead("known", RANGE.since)]);
  partial.sources.landing = { state: "unavailable", message: "מקור נחיתה חסר" };
  const result = await loadScaleAnalysis(NOW, sources({ readLeadFacts: async () => partial }));
  assert.equal(result.assessments[0].candidate, true);
  assert.equal(result.assessments[0].dataComplete, false);
  assert.equal(result.assessments[0].cpa, null);
  assert.deepEqual(result.assessments[0].budgetTargets, []);
  assert.ok(result.metadata.notices.includes("מקור נחיתה חסר"));
});

test("a failed fact loader is unavailable, and demo advertising never calls or joins the real lead source", async () => {
  const result = await loadScaleAnalysis(NOW, sources({ readLeadFacts: async () => { throw new Error("private source details"); } }));
  assert.equal(result.assessments[0].status, "unavailable");
  assert.deepEqual(result.assessments[0].budgetTargets, []);
  assert.ok(!JSON.stringify(result).includes("private source details"));
  let leadReads = 0;
  const demo = await loadScaleAnalysis(NOW, sources({ source: "mock", readLeadFacts: async () => { leadReads += 1; return facts([lead("real", RANGE.since)]); } }));
  assert.equal(leadReads, 0);
  assert.equal(demo.metadata.source, "mock");
  assert.equal(demo.assessments[0].candidate, false);
  assert.deepEqual(demo.assessments[0].budgetTargets, []);
});

test("newly excluded recruiters carrying ID-only facts never leak into course scale analysis", async () => {
  const data = snapshot();
  data.excludedCampaigns = [{ ...campaign, id: "new-recruiter", name: "דרושים | גיוס" }];
  const result = await loadScaleAnalysis(NOW, sources({ readCampaigns: async () => data, readLeadFacts: async () => facts([
    lead("course", RANGE.since),
    lead("recruitment", RANGE.since, { campaignId: "new-recruiter", adSetId: null, adId: null }),
  ]) }));
  assert.equal(result.assessments.length, 1);
  assert.equal(result.assessments[0].registrations, 1);
});

test("unlisted spend withholds exact increases, while inactive campaigns remain candidates for reactivation review", async () => {
  const data = snapshot();
  data.unlisted = { spend: 20, impressions: 10, reach: null, linkClicks: 0, leads: 0, sales: 0, revenue: 0 };
  const unlisted = await loadScaleAnalysis(NOW, sources({ readCampaigns: async () => data }));
  assert.equal(unlisted.assessments[0].candidate, true);
  assert.deepEqual(unlisted.assessments[0].budgetTargets, []);
  assert.ok(unlisted.metadata.notices.some((notice) => notice.includes("הוצאה")));
  const pausedData = snapshot();
  pausedData.campaigns = [{ ...campaign, status: "paused" }];
  const paused = await loadScaleAnalysis(NOW, sources({ readCampaigns: async () => pausedData }));
  assert.equal(paused.assessments[0].candidate, true);
  assert.equal(paused.assessments[0].action, "reactivate_review");
  assert.deepEqual(paused.assessments[0].budgetTargets, []);
});

test("fixed-window ad closures keep winning, zero-result and unassigned origins separate through the loader", async () => {
  const original = campaign.adSets[0].ads[0];
  const data = snapshot();
  data.campaigns = [{ ...campaign, adSets: [{ ...campaign.adSets[0], ads: [original, { ...original, id: "other-ad", name: original.name, metrics: { ...original.metrics, spend: 200 } }] }] }];
  const result = await loadScaleAnalysis(NOW, sources({ readCampaigns: async () => data, readLeadFacts: async () => facts([
    lead("closed", RANGE.since),
    lead("other", RANGE.since, { adId: "other-ad", mainStatus: "חדש", secondaryStatus: "חדש" }),
    lead("unassigned", RANGE.since, { adId: null, adSetId: null }),
  ]) }));
  const assessment = result.assessments[0];
  const ads = assessment.adClosures ?? [];
  assert.equal(assessment.registrations, 2);
  assert.equal(ads.find((ad) => ad.adId === original.id)?.closures, 1);
  assert.equal(ads.find((ad) => ad.adId === "other-ad")?.closures, 0, "an equal display name must not inherit a sibling's enrollment");
  assert.equal(ads.find((ad) => ad.isUnassigned)?.closures, 1);
  assert.equal(ads.find((ad) => ad.isUnassigned)?.costPerClosure, null);
  assert.equal(ads.reduce((sum, ad) => sum + ad.closures, 0), assessment.registrations);
});
