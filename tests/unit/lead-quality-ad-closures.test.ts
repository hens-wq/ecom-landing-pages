import assert from "node:assert/strict";
import { test } from "node:test";

import { buildLeadQualityReport } from "@/lib/lead-quality";
import { buildAdClosureSummaries } from "@/lib/lead-quality/ad-closures";
import { buildScaleAssessments } from "@/lib/lead-quality/scale";
import type { LeadFact } from "@/lib/performance/types";
import type { Campaign } from "@/lib/types";

const RANGE = { since: "2026-10-13", until: "2026-11-11" };
function sourceCampaign(): Campaign {
  return {
    id: "C1", name: "קמפיין קורס", objective: "Leads", status: "active",
    adSets: [
      { id: "S1", name: "סדרה פעילה", campaignId: "C1", status: "active", ads: [
        { id: "A1", name: "2", adSetId: "S1", status: "active", destinationType: "meta_standard_form", metrics: { spend: 1000, impressions: 2000, reach: 1500, linkClicks: 50, leads: 999, sales: 999, revenue: 999 } },
        { id: "A0", name: "מודעה ללא לידים", adSetId: "S1", status: "paused", destinationType: "meta_standard_form", metrics: { spend: 400, impressions: 1000, reach: 700, linkClicks: 20, leads: 999, sales: 999, revenue: 999 } },
      ] },
      { id: "S2", name: "סדרה סגורה", campaignId: "C1", status: "paused", ads: [
        { id: "A2", name: "2", adSetId: "S2", status: "active", destinationType: "meta_standard_form", metrics: { spend: 3500, impressions: 3000, reach: 2000, linkClicks: 60, leads: 999, sales: 999, revenue: 999 } },
      ] },
    ],
  };
}
function lead(id: string, adId: string | null = "A1", overrides: Partial<LeadFact> = {}): LeadFact {
  return {
    id, sourceType: "meta_standard_form", leadDate: "2026-11-03", campaignId: "C1", adSetId: adId === "A2" ? "S2" : adId ? "S1" : null, adId,
    statusKnown: true, mainStatus: "נרשם", secondaryStatus: "נרשם", fullPaymentAmount: null, partialPaymentAmount: null, ...overrides,
  };
}

test("closures stay with each ad ID, even when two ads share a name, and use the ad's own spend", () => {
  const source = sourceCampaign();
  const report = buildLeadQualityReport({ campaigns: [source], leads: [lead("sale-A1"), lead("sale-A2", "A2"), lead("sale-unknown", null)], range: RANGE });
  const rows = buildAdClosureSummaries({ campaign: report.campaigns[0], sourceCampaign: source });
  const a1 = rows.find((row) => row.adId === "A1")!;
  const a2 = rows.find((row) => row.adId === "A2")!;
  assert.equal(a1.adName, a2.adName);
  assert.equal(a1.closures, 1);
  assert.equal(a2.closures, 1);
  assert.equal(a1.costPerClosure, 1000);
  assert.equal(a2.costPerClosure, 3500);
  assert.notEqual(a1.costPerClosure, report.campaigns[0].summary.costPerSale);
  assert.notEqual(a2.costPerClosure, report.campaigns[0].summary.costPerSale);
  assert.equal(rows.reduce((sum, row) => sum + row.closures, 0), 3, "campaign registrations are not spread across the real ads");
  assert.equal(a1.complete, true);
  assert.equal(a2.complete, true);
});

test("all paused and zero-result ads remain, with authentic parent status instead of an inference from the child", () => {
  const source = sourceCampaign();
  const report = buildLeadQualityReport({ campaigns: [source], leads: [lead("one")], range: RANGE });
  const rows = buildAdClosureSummaries({ campaign: report.campaigns[0], sourceCampaign: source });
  assert.deepEqual(rows.map((row) => row.adId), ["A1", "A0", "A2"]);
  assert.equal(rows[1].status, "paused");
  assert.equal(rows[1].parentStatus, "active");
  assert.equal(rows[1].closures, 0);
  assert.equal(rows[1].totalLeads, 0);
  assert.equal(rows[1].complete, true);
  assert.equal(rows[1].costPerClosure, null);
  assert.equal(rows[2].status, "active");
  assert.equal(rows[2].parentStatus, "paused", "an active-looking child never makes its actual paused parent active");
});

test("unknown ad attribution keeps its own registrations in one synthetic row with no claimed CPA or parent", () => {
  const source = sourceCampaign();
  const report = buildLeadQualityReport({ campaigns: [source], leads: [
    lead("campaign-only", null), lead("set-only", null, { adSetId: "S2", secondaryStatus: "תשלום חלקי" }),
  ], range: RANGE });
  const rows = buildAdClosureSummaries({ campaign: report.campaigns[0], sourceCampaign: source });
  const unknown = rows.filter((row) => row.isUnassigned);
  assert.equal(unknown.length, 1);
  assert.equal(unknown[0].adId, "unassigned-ad:C1");
  assert.equal(unknown[0].closures, 2);
  assert.equal(unknown[0].costPerClosure, null);
  assert.equal(unknown[0].spend, null);
  assert.equal(unknown[0].adSetId, null);
  assert.equal(unknown[0].parentStatus, null);
  assert.ok(rows.filter((row) => !row.isUnassigned).every((row) => row.closures === 0), "no real ad claims the unidentified sales");
});

test("source or status incompleteness retains observed closures while withholding cost per closure", () => {
  const source = sourceCampaign();
  for (const mode of ["source", "status"] as const) {
    const leads = [lead("known")];
    if (mode === "status") leads.push(lead("unknown", "A1", { statusKnown: false, mainStatus: null, secondaryStatus: null }));
    const report = buildLeadQualityReport({ campaigns: [source], leads, range: RANGE, leadsKnown: mode !== "source" });
    const row = buildAdClosureSummaries({ campaign: report.campaigns[0], sourceCampaign: source })[0];
    assert.equal(row.closures, 1, mode);
    assert.equal(row.complete, false, mode);
    assert.equal(row.costPerClosure, null, mode);
  }
});

test("an unmapped quality label alone does not hide an otherwise known main-status registration count", () => {
  const source = sourceCampaign();
  const report = buildLeadQualityReport({ campaigns: [source], leads: [
    lead("enrolled-unmapped", "A1", { secondaryStatus: "סטטוס תשלום שטרם מופה" }),
    lead("not-enrolled-unmapped", "A1", { mainStatus: "לא מעוניין", secondaryStatus: "סיבה חדשה" }),
  ], range: RANGE });
  assert.equal(report.campaigns[0].ads[0].summary.unmapped.count, 2);
  const row = buildAdClosureSummaries({ campaign: report.campaigns[0], sourceCampaign: source })[0];
  assert.equal(row.complete, true);
  assert.equal(row.closures, 1);
  assert.equal(row.costPerClosure, 1000);
});

test("known source-free spend can legitimately yield a zero cost, while missing spend or missing parent metadata stays honest", () => {
  const source = sourceCampaign();
  source.adSets[0].ads[0].metrics.spend = 0;
  const report = buildLeadQualityReport({ campaigns: [source], leads: [lead("one")], range: RANGE });
  const row = buildAdClosureSummaries({ campaign: report.campaigns[0] })[0];
  assert.equal(row.costPerClosure, 0);
  assert.equal(row.parentStatus, null, "a missing parent source is not inferred from the ad");
  const campaignRow = structuredClone(report.campaigns[0]);
  campaignRow.ads[0].spend = null;
  const missingSpend = buildAdClosureSummaries({ campaign: campaignRow, sourceCampaign: source })[0];
  assert.equal(missingSpend.closures, 1);
  assert.equal(missingSpend.costPerClosure, null);
});

test("the scale builder attaches own-ad closure data even for none or partial assessments without changing eligibility", () => {
  const source = sourceCampaign();
  const emptyReport = buildLeadQualityReport({ campaigns: [source], leads: [], range: RANGE });
  const none = buildScaleAssessments({ report: emptyReport, campaigns: [source] })[0];
  assert.equal(none.status, "none");
  assert.equal(none.adClosures?.length, 3);
  assert.ok(none.adClosures?.every((row) => row.closures === 0 && row.complete));
  const partialReport = buildLeadQualityReport({ campaigns: [source], leads: [lead("one")], range: RANGE, leadsKnown: false });
  const partial = buildScaleAssessments({ report: partialReport, campaigns: [source] })[0];
  assert.equal(partial.candidate, true);
  assert.equal(partial.status, "review");
  assert.equal(partial.adClosures?.[0].closures, 1);
  assert.equal(partial.adClosures?.[0].complete, false);
  assert.deepEqual(partial.budgetTargets, []);
});

test("demo summaries never invent positive registrations", () => {
  const source = sourceCampaign();
  const report = buildLeadQualityReport({ campaigns: [source], leads: [lead("fake-positive")], range: RANGE });
  const rows = buildAdClosureSummaries({ campaign: report.campaigns[0], sourceCampaign: source, source: "mock" });
  assert.ok(rows.every((row) => row.closures === 0 && !row.complete && row.costPerClosure === null));
  const assessment = buildScaleAssessments({ report, campaigns: [source], source: "mock" })[0];
  assert.equal(assessment.candidate, false);
  assert.ok(assessment.adClosures?.every((row) => row.closures === 0));
});

test("closure summaries have a fixed compact schema and never copy full status columns or mutate the report", () => {
  const source = sourceCampaign();
  source.adSets[0].ads = Array.from({ length: 379 }, (_, index) => ({ ...source.adSets[0].ads[0], id: `ad-${index}`, name: `מודעה ${index}` }));
  source.adSets.splice(1);
  const report = buildLeadQualityReport({ campaigns: [source], leads: [], range: RANGE });
  const input = { campaign: report.campaigns[0], sourceCampaign: source };
  const before = structuredClone(input);
  const rows = buildAdClosureSummaries(input);
  assert.equal(rows.length, 379);
  assert.deepEqual(Object.keys(rows[0]).sort(), ["adId", "adName", "adSetId", "adSetName", "status", "parentStatus", "isUnassigned", "spend", "totalLeads", "closures", "costPerClosure", "complete"].sort());
  assert.ok(Buffer.byteLength(JSON.stringify(rows), "utf8") < 150_000, "the compact response does not duplicate status maps for hundreds of ads");
  assert.deepEqual(input, before);
});
