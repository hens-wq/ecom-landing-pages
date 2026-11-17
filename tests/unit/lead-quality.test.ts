import assert from "node:assert/strict";
import { test } from "node:test";

import { buildLeadQualityReport, fullSecondaryStatusLabel, leadQualityStatusId } from "@/lib/lead-quality";
import type { LeadQualityRow } from "@/lib/lead-quality";
import type { LeadFact } from "@/lib/performance/types";
import type { Campaign, RawMetrics } from "@/lib/types";

const RANGE = { since: "2026-11-01", until: "2026-11-07" };
function metrics(spend: number): RawMetrics {
  return { spend, impressions: 1000, reach: 700, linkClicks: 20, leads: 999, sales: 999, revenue: 999 };
}
function campaign(id = "C1", status: Campaign["status"] = "active", spend = 300): Campaign {
  return {
    id, name: `קמפיין ${id}`, objective: "Leads", status,
    adSets: [{ id: `S${id}`, name: `סדרה ${id}`, campaignId: id, status, ads: [
      { id: `A${id}`, name: `מודעה ${id}`, adSetId: `S${id}`, status: "active", destinationType: "unknown", metrics: metrics(spend) },
    ] }],
  };
}
function lead(id: string, secondaryStatus = "חדש", overrides: Partial<LeadFact> = {}): LeadFact {
  const mainStatus = secondaryStatus.startsWith('ל"מ') ? "לא מעוניין" : secondaryStatus.startsWith("ליד שגוי") ? "ליד שגוי" : secondaryStatus;
  return {
    id, sourceType: "meta_standard_form", leadDate: "2026-11-04", campaignId: "C1", adSetId: "SC1", adId: "AC1",
    statusKnown: true, mainStatus, secondaryStatus, fullPaymentAmount: null, partialPaymentAmount: null, ...overrides,
  };
}
function statusCountSum(row: LeadQualityRow): number {
  return Object.values(row.statusCounts).reduce((sum, value) => sum + value.count, 0);
}

test("each lead appears in exactly one secondary cell; all percentages use the whole row's cohort", () => {
  const report = buildLeadQualityReport({ campaigns: [campaign()], range: RANGE, leads: [
    lead("l1", "בתהליך"), lead("l2", 'ל"מ - אין שיתוף פעולה'), lead("l3", "חדש"),
    lead("l4", "חדש"), lead("l5", "חדש"), lead("l6", "חדש"),
  ] });
  const row = report.campaigns[0];
  assert.equal(row.totalLeads, 6);
  assert.equal(statusCountSum(row), 6);
  assert.equal(statusCountSum(row.ads[0]), 6);
  assert.equal(row.cpl, 50, "uses actual lead facts, never Meta's inflated action counts");
  assert.ok(Math.abs((row.summary.relevant.percent ?? 0) - 16.66666666666667) < 1e-10);
  assert.ok(Math.abs((row.summary.irrelevant.percent ?? 0) - 16.66666666666667) < 1e-10);
  assert.equal(row.summary.undetermined.percent, (4 / 6) * 100);
  assert.equal(row.statusCounts[leadQualityStatusId("לא מעוניין", 'ל"מ - אין שיתוף פעולה')].count, 1);
  assert.ok(Math.abs((row.statusCounts[leadQualityStatusId("לא מעוניין", 'ל"מ - אין שיתוף פעולה')].percent ?? 0) - 16.66666666666667) < 1e-10);
});

test("campaigns open directly into ads and an ad's percentages use its own denominator", () => {
  const c = campaign();
  c.adSets.push({ id: "S2", name: "סדרה שנייה", campaignId: c.id, status: "paused", ads: [
    { id: "A2", name: "מודעה כבויה", adSetId: "S2", status: "paused", destinationType: "unknown", metrics: metrics(100) },
  ] });
  const report = buildLeadQualityReport({ campaigns: [c], range: RANGE, leads: [
    lead("l1", "בתהליך"), lead("l2", "חדש"), lead("l3", "חדש", { adId: "A2", adSetId: "S2" }),
  ] });
  const row = report.campaigns[0];
  assert.equal(row.ads.length, 2);
  assert.equal(row.spend, 400, "paused ads' delivery in the selected range is retained");
  assert.equal(row.summary.relevant.percent, (1 / 3) * 100);
  assert.equal(row.ads[0].summary.relevant.percent, 50);
  assert.equal(row.ads[1].summary.undetermined.percent, 100);
  assert.equal(row.ads[1].status, "paused");
});

test("the established secondary classifier is reused, including future potential and normalized separators", () => {
  const report = buildLeadQualityReport({ campaigns: [campaign()], range: RANGE, leads: [
    lead("future", 'ל״מ - פוטנציאל עתידי'),
    lead("schedule", 'ל"מ - לו"ז / מבנה הקורס'),
    lead("red", "ליד שגוי - חשב/ה מדובר בעבודה"),
    lead("pending", 'א"מ - יום 2', { mainStatus: "אין מענה" }),
    lead("custom", "סיבה שטרם הוגדרה", { mainStatus: "לא מעוניין" }),
  ] });
  const columns = report.groups.flatMap((group) => group.statuses);
  assert.equal(columns.find((column) => column.id === leadQualityStatusId("לא מעוניין", 'ל"מ - פוטנציאל עתידי'))?.color, "green");
  assert.equal(columns.find((column) => column.id === leadQualityStatusId("אין מענה", 'א"מ - יום 2'))?.color, "orange");
  assert.equal(columns.find((column) => column.secondaryStatus === "סיבה שטרם הוגדרה")?.color, "neutral");
  const summary = report.campaigns[0].summary;
  assert.equal(summary.relevant.count, 2);
  assert.equal(summary.irrelevant.count, 1);
  assert.equal(summary.undetermined.count, 2);
  assert.equal(summary.unmapped.count, 1);
});

test("status labels expand abbreviations without exposing parent statuses as extra metrics", () => {
  assert.equal(fullSecondaryStatusLabel("לא מעוניין", 'ל"מ - פוטנציאל עתידי'), "לא מעוניין - פוטנציאל עתידי");
  assert.equal(fullSecondaryStatusLabel("אין מענה", 'א"מ - יום 1'), "אין מענה - יום 1");
  assert.equal(fullSecondaryStatusLabel("ביטול הרשמה", "ביטל הרשמה - BDI שלילי"), "ביטול הרשמה - BDI שלילי");
  assert.equal(fullSecondaryStatusLabel("ליד שגוי", "ליד שגוי - קטין"), "ליד שגוי - קטין");
  assert.equal(fullSecondaryStatusLabel("חדש", "חדש"), "חדש");
  const report = buildLeadQualityReport({ campaigns: [], range: RANGE, leads: [] });
  const group = report.groups.find((item) => item.id === "לא מעוניין")!;
  assert.ok(group.statuses.every((column) => column.secondaryStatus !== "לא מעוניין"));
});

test("duplicate lead IDs count once, but distinct IDs remain separate; the last source fact wins", () => {
  const report = buildLeadQualityReport({ campaigns: [campaign()], range: RANGE, leads: [
    lead("same", "חדש"), lead("other", "חדש"), lead("same", "בתהליך"),
  ] });
  assert.equal(report.campaigns[0].totalLeads, 2);
  assert.equal(report.campaigns[0].summary.relevant.count, 1);
  assert.equal(report.diagnostics.duplicateLeadIds, 1);
});

test("cohort filtering uses inclusive entry dates only, preserving current sale status", () => {
  const report = buildLeadQualityReport({ campaigns: [campaign()], range: RANGE, leads: [
    lead("before", "חדש", { leadDate: "2026-10-31" }),
    lead("start", "נרשם", { leadDate: RANGE.since }),
    lead("end", "חדש", { leadDate: RANGE.until }),
    lead("after", "חדש", { leadDate: "2026-11-08" }),
    lead("invalid", "חדש", { leadDate: "2026-02-31" }),
    lead("timestamp", "חדש", { leadDate: "2026-11-04T12:00:00Z" }),
  ] });
  assert.equal(report.totals.totalLeads, 2);
  assert.equal(report.totals.summary.sales.count, 1);
  assert.equal(report.diagnostics.outsideRangeLeads, 2);
  assert.equal(report.diagnostics.invalidDateLeads, 2);
});

test("unidentified ads remain as a visible lead-only ad, and unidentified campaigns remain separately visible", () => {
  const report = buildLeadQualityReport({ campaigns: [campaign()], range: RANGE, leads: [
    lead("ad"),
    lead("adset", "חדש", { adId: "not-listed" }),
    lead("campaign", "חדש", { adId: null, adSetId: null }),
    lead("unassigned", "חדש", { adId: null, adSetId: null, campaignId: null }),
    lead("missingCampaign", "חדש", { adId: null, adSetId: null, campaignId: "not-listed" }),
  ] });
  const row = report.campaigns[0];
  assert.equal(row.totalLeads, 3);
  assert.equal(row.ads.reduce((sum, ad) => sum + ad.totalLeads, 0), 3);
  const unidentified = row.ads.find((ad) => ad.isUnassigned)!;
  assert.equal(unidentified.totalLeads, 2);
  assert.equal(unidentified.spend, null);
  assert.equal(unidentified.cpl, null);
  assert.equal(report.unassigned?.totalLeads, 2);
  assert.equal(report.unassigned?.cpl, null);
  assert.equal(report.diagnostics.unassignedLeads, 2);
  assert.equal(report.totals.totalLeads, 3, "the current-status scope does not invent an active status for unattributed leads");
});

test("known ads and ad sets determine attribution before a contradictory campaign ID", () => {
  const c1 = campaign();
  const c2 = campaign("C2", "paused", 50);
  const report = buildLeadQualityReport({ campaigns: [c1, c2], range: RANGE, statusFilter: "all", leads: [
    lead("conflict", "חדש", { campaignId: "C2" }),
    lead("adsetOnly", "חדש", { campaignId: "C2", adId: null }),
  ] });
  assert.equal(report.campaigns.find((row) => row.id === "C1")?.totalLeads, 2);
  assert.equal(report.campaigns.find((row) => row.id === "C2")?.totalLeads, 0);
  assert.equal(report.totals.totalLeads, 2);
  assert.equal(report.diagnostics.conflictingAttributionLeads, 2);
});

test("active/inactive filters change campaign scope without discarding paused ads or unknown campaign leads", () => {
  const campaigns = [campaign(), campaign("C2", "paused", 700), campaign("C3", "ended", 10)];
  const leads = [lead("a"), lead("b", "חדש", { campaignId: "C2", adSetId: "SC2", adId: "AC2" }), lead("c", "חדש", { campaignId: "C3", adSetId: "SC3", adId: "AC3" })];
  const active = buildLeadQualityReport({ campaigns, leads, range: RANGE });
  const inactive = buildLeadQualityReport({ campaigns, leads, range: RANGE, statusFilter: "inactive" });
  const all = buildLeadQualityReport({ campaigns, leads, range: RANGE, statusFilter: "all", unlisted: metrics(25) });
  assert.deepEqual(active.campaigns.map((row) => row.id), ["C1"]);
  assert.equal(active.totals.spend, 300);
  assert.deepEqual(inactive.campaigns.map((row) => row.id), ["C2", "C3"]);
  assert.equal(inactive.totals.totalLeads, 2);
  assert.equal(inactive.totals.spend, 710);
  assert.equal(all.totals.spend, 1010);
  assert.equal(all.unlistedSpend, 25, "unlisted delivery remains explicit, never mixed into listed-campaign spend");
});

test("sales follow existing enrolled status and revenue counts only the active payment once", () => {
  const report = buildLeadQualityReport({ campaigns: [campaign()], range: RANGE, leads: [
    lead("enrolled", "נרשם"),
    lead("partial", "תשלום חלקי", { mainStatus: "נרשם", partialPaymentAmount: 1000, fullPaymentAmount: 20000 }),
    lead("full", "תשלום מלא", { mainStatus: "נרשם", partialPaymentAmount: 4000, fullPaymentAmount: 12000 }),
    lead("notEnrolled", "תשלום מלא", { mainStatus: "בתהליך", fullPaymentAmount: 10000 }),
  ] });
  const row = report.campaigns[0];
  assert.equal(row.summary.sales.count, 3);
  assert.equal(row.summary.sales.percent, 75);
  assert.equal(row.summary.revenue, 13000);
  assert.equal(row.summary.costPerSale, 100);
  assert.equal(row.summary.relevant.count, 4, "quality still follows secondary status independently from sale identification");
});

test("common reasons are exact documented secondary reasons, not inferred from operational statuses", () => {
  const report = buildLeadQualityReport({ campaigns: [campaign()], range: RANGE, leads: [
    ...Array.from({ length: 6 }, (_, index) => lead(`new-${index}`, "חדש")),
    lead("job1", "ליד שגוי - חשב/ה מדובר בעבודה"),
    lead("job2", "ליד שגוי - חשב/ה מדובר בעבודה"),
    lead("price", 'ל"מ - מחיר יקר'),
    lead("noAnswer", 'א"מ - יום 3', { mainStatus: "אין מענה" }),
  ] });
  const row = report.campaigns[0];
  assert.equal(row.summary.topReason?.label, "ליד שגוי - חשב/ה מדובר בעבודה");
  assert.equal(row.summary.topReason?.count, 2);
  assert.equal(row.summary.topReason?.percent, 20);
  assert.equal(row.summary.commonReasons.length, 2);
  assert.ok(row.summary.commonReasons.every((reason) => !reason.label.includes("בעיה בקריאייטיב")), "no diagnosis is invented");
});

test("unavailable or missing statuses stay neutral and cover the unknown share instead of becoming red or new", () => {
  const report = buildLeadQualityReport({ campaigns: [campaign()], range: RANGE, leads: [
    lead("unavailable", "תשלום מלא", { mainStatus: "נרשם", statusKnown: false }),
    lead("missing", "", { mainStatus: "לא מעוניין" }),
    lead("known", "בתהליך"),
  ] });
  const row = report.campaigns[0];
  assert.equal(row.unknownStatusLeads, 2);
  assert.equal(row.summary.unknown.count, 2);
  assert.equal(row.summary.irrelevant.count, 0);
  assert.equal(row.summary.sales.count, 0);
  assert.equal(row.summary.qualifiedCpl, null, "unknown statuses could change the green count");
  assert.equal(row.summary.costPerSale, null);
  assert.equal(statusCountSum(row), 3);
  assert.equal(row.summary.relevant.count + row.summary.irrelevant.count + row.summary.undetermined.count, row.totalLeads);
  assert.ok(report.groups.flatMap((group) => group.statuses).filter((column) => column.classification === "unknown").every((column) => column.color === "neutral"));
});

test("partial lead sources preserve observed counts but never publish misleading rates or CPL", () => {
  const report = buildLeadQualityReport({ campaigns: [campaign()], range: RANGE, leadsKnown: false, leads: [lead("known", "בתהליך")] });
  const row = report.campaigns[0];
  assert.equal(row.totalLeads, 1);
  assert.equal(row.leadsKnown, false);
  assert.equal(row.spend, 300);
  assert.equal(row.cpl, null);
  assert.equal(row.summary.relevant.count, 1);
  assert.equal(row.summary.relevant.percent, null);
  assert.equal(row.summary.sales.percent, null);
  assert.ok(Object.values(row.statusCounts).every((count) => count.percent === null));
});

test("empty cohorts expose zero counts and null ratios, with no NaN or Infinity", () => {
  const report = buildLeadQualityReport({ campaigns: [campaign()], range: RANGE, leads: [] });
  const row = report.campaigns[0];
  assert.equal(row.totalLeads, 0);
  assert.equal(row.cpl, null);
  assert.equal(row.summary.relevant.percent, null);
  assert.equal(row.summary.sales.percent, null);
  assert.equal(row.summary.costPerSale, null);
  assert.equal(row.summary.topReason, null);
  assert.ok(Object.values(row.statusCounts).every((count) => count.count === 0 && count.percent === null));
  assert.ok(!JSON.stringify(report).includes("NaN"));
  assert.ok(!JSON.stringify(report).includes("Infinity"));
});

test("input records and campaign delivery are never mutated", () => {
  const input = { campaigns: [campaign()], range: RANGE, leads: [lead("known", "בתהליך")] };
  const before = structuredClone(input);
  buildLeadQualityReport(input);
  assert.deepEqual(input, before);
});

test("ad-set overviews preserve source order and authentic status, including empty inactive sets", () => {
  const c = campaign();
  c.adSets[0].ads[0].status = "paused";
  c.adSets.push(
    { id: "empty-paused", name: "סדרה ריקה וסגורה", campaignId: c.id, status: "paused", ads: [] },
    { id: "paused-with-active-child", name: "סדרה סגורה", campaignId: c.id, status: "paused", ads: [
      { id: "A2", name: "מודעה בעלת סטטוס פעיל", adSetId: "paused-with-active-child", status: "active", destinationType: "unknown", metrics: metrics(120) },
    ] },
    { id: "empty-ended", name: "סדרה שהסתיימה", campaignId: c.id, status: "ended", ads: [] },
  );
  const report = buildLeadQualityReport({ campaigns: [c], range: RANGE, leads: [
    lead("first"), lead("second", "חדש", { adSetId: "paused-with-active-child", adId: "A2" }),
  ] });
  const row = report.campaigns[0];
  assert.deepEqual(row.adSets.map((adSet) => adSet.id), ["SC1", "empty-paused", "paused-with-active-child", "empty-ended"]);
  assert.equal(row.adSets[0].status, "active", "an active set is never inferred inactive from its paused ads");
  assert.equal(row.adSets[2].status, "paused", "a paused set is never inferred active from a child");
  assert.equal(row.adSets[2].level, "adset");
  assert.equal(row.adSets[2].campaignId, c.id);
  assert.equal(row.adSets[2].spend, 120);
  assert.equal(row.adSets[2].totalLeads, 1);
  assert.equal(row.adSets[2].cpl, 120);
  assert.equal(row.adSets[1].status, "paused");
  assert.equal(row.adSets[1].spend, 0);
  assert.equal(row.adSets[1].totalLeads, 0);
  assert.equal(row.adSets[1].cpl, null);
  assert.deepEqual(row.adSets[1].adIds, []);
  assert.equal(row.adSets[3].status, "ended");
  assert.equal(row.ads.length, 2, "the compatibility flat list still contains all ads regardless of visibility");
  assert.deepEqual(row.adSets[0].adIds, ["AC1"]);
  assert.deepEqual(row.adSets[2].adIds, ["A2"]);
  assert.ok(row.adSets.every((adSet) => !("ads" in adSet)), "full ad rows must only be serialized once in campaign.ads");
  assert.equal(row.spend, 420);
  assert.equal(row.totalLeads, 2);
  assert.equal(row.cpl, 210);
  assert.equal(report.totals.spend, 420);
  assert.equal(report.totals.totalLeads, 2);
});

test("ad-set counts include set-only attribution, while the combined unassigned-ad row stays separate and is counted once", () => {
  const c = campaign();
  c.adSets.push({ id: "S2", name: "סדרה שנייה", campaignId: c.id, status: "paused", ads: [
    { id: "A2", name: "מודעה שנייה", adSetId: "S2", status: "paused", destinationType: "unknown", metrics: metrics(100) },
  ] });
  const report = buildLeadQualityReport({ campaigns: [c, campaign("C2")], range: RANGE, leads: [
    lead("ad-only", "חדש", { campaignId: null, adSetId: null }),
    lead("set-only", 'ל"מ - פוטנציאל עתידי', { adId: null }),
    lead("set-unlisted-ad", "ליד שגוי - חשב/ה מדובר בעבודה", { adId: "unlisted-ad" }),
    lead("conflicting-parents", "חדש", { campaignId: "C2", adSetId: "SC1", adId: "A2" }),
    lead("campaign-only", "חדש", { adSetId: null, adId: null }),
  ] });
  const row = report.campaigns.find((item) => item.id === "C1")!;
  const firstSet = row.adSets[0];
  const secondSet = row.adSets[1];
  assert.equal(firstSet.totalLeads, 3, "both direct-set leads belong in the parent overview");
  assert.equal(firstSet.cpl, 100);
  assert.equal(firstSet.unassignedLeadCount, 2);
  assert.equal(firstSet.adIds.length, 1, "nested IDs reference real listed ads only, without duplicated full ad objects or synthetic rows");
  assert.equal(row.ads.find((ad) => ad.id === firstSet.adIds[0])?.totalLeads, 1);
  assert.equal(firstSet.summary.relevant.count, 1);
  assert.ok(Math.abs((firstSet.summary.relevant.percent ?? 0) - 33.33333333333333) < 1e-10);
  assert.equal(firstSet.statusCounts[leadQualityStatusId("ליד שגוי", "ליד שגוי - חשב/ה מדובר בעבודה")].count, 1);
  assert.equal(secondSet.totalLeads, 1, "the deepest listed ad takes precedence over contradictory campaign/ad-set IDs");
  assert.equal(secondSet.unassignedLeadCount, 0);
  assert.equal(secondSet.summary.undetermined.percent, 100);
  const unknown = row.ads.filter((ad) => ad.isUnassigned);
  assert.equal(unknown.length, 1, "the existing campaign-level combined unknown-ad row is retained");
  assert.equal(unknown[0].totalLeads, 3);
  assert.equal(unknown[0].adSetId, null);
  assert.equal(unknown[0].spend, null);
  assert.equal(row.ads.reduce((sum, ad) => sum + ad.totalLeads, 0), 5);
  assert.equal(row.totalLeads, 5);
  assert.equal(row.cpl, 80);
  assert.equal(row.adSets.reduce((sum, adSet) => sum + adSet.totalLeads, 0), 4, "a campaign-only lead is not invented as a member of any set");
  assert.equal(report.campaigns.find((item) => item.id === "C2")?.totalLeads, 0);
  assert.equal(report.diagnostics.conflictingAttributionLeads, 1);
});

test("an empty listed set can hold set-only leads without inventing ad identity or hiding their status", () => {
  const c = campaign();
  c.adSets.push({ id: "empty-set", name: "סדרה סגורה ללא מודעות מזוהות", campaignId: c.id, status: "paused", ads: [] });
  const report = buildLeadQualityReport({ campaigns: [c], range: RANGE, leads: [
    lead("only-set", "בתהליך", { adSetId: "empty-set", adId: null }),
    lead("only-campaign", "חדש", { adSetId: null, adId: null }),
  ] });
  const row = report.campaigns[0];
  const emptySet = row.adSets[1];
  assert.equal(emptySet.totalLeads, 1);
  assert.equal(emptySet.unassignedLeadCount, 1);
  assert.equal(emptySet.summary.relevant.count, 1);
  assert.equal(emptySet.summary.relevant.percent, 100);
  assert.equal(statusCountSum(emptySet), 1);
  assert.deepEqual(emptySet.adIds, []);
  assert.equal(row.ads.find((ad) => ad.isUnassigned)?.totalLeads, 2);
  assert.equal(row.totalLeads, 2);
  assert.equal(report.totals.totalLeads, 2);
});

test("ad-set partial-source and unknown-status handling reuses the same safeguards as campaign and ad rows", () => {
  const report = buildLeadQualityReport({ campaigns: [campaign()], range: RANGE, leadsKnown: false, leads: [
    lead("partial", "בתהליך"), lead("unknown", "חדש", { statusKnown: false, adId: null }),
  ] });
  const adSet = report.campaigns[0].adSets[0];
  assert.equal(adSet.leadsKnown, false);
  assert.equal(adSet.spend, 300);
  assert.equal(adSet.totalLeads, 2);
  assert.equal(adSet.unassignedLeadCount, 1);
  assert.equal(adSet.unknownStatusLeads, 1);
  assert.equal(adSet.cpl, null);
  assert.equal(adSet.summary.relevant.percent, null);
  assert.equal(adSet.summary.qualifiedCpl, null);
  assert.ok(Object.values(adSet.statusCounts).every((value) => value.percent === null));
});
