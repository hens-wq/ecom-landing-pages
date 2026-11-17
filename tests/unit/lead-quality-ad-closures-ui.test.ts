import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AdClosureBand, AdClosuresSourceTable, getClosureCostColor } from "@/components/lead-quality/ad-closures";
import { CampaignAdList, CampaignQualityCard, formatAdName } from "@/components/lead-quality/quality-cards";
import { buildLeadQualityReport } from "@/lib/lead-quality";
import type { AdClosureSummary } from "@/lib/lead-quality/ad-closures";
import { formatCplCurrency } from "@/lib/lead-quality/presentation";
import { SCALE_COHORT_BASIS, type CampaignScaleAssessment } from "@/lib/lead-quality/scale";
import type { Campaign } from "@/lib/types";

const range = { since: "2026-10-13", until: "2026-11-11" };
function summary(overrides: Partial<AdClosureSummary> = {}): AdClosureSummary {
  return { adId: "ad-a", adName: "2", adSetId: "set-a", adSetName: "טופס רגיל", status: "active", parentStatus: "active", isUnassigned: false, spend: 4415.44, totalLeads: 20, closures: 2, costPerClosure: 2207.72, complete: true, ...overrides };
}
const summaries = [
  summary(),
  summary({ adId: "ad-b", adSetId: "set-b", adSetName: "שלוש שאלות", status: "active", parentStatus: "paused", spend: 1100, closures: 1, costPerClosure: 1100 }),
  summary({ adId: "ad-zero", adName: "מודעה בלי סגירות", closures: 0, costPerClosure: null }),
  summary({ adId: "unassigned-ad:closures-campaign", adName: "לידים ללא שיוך למודעה", adSetId: null, adSetName: null, status: null, parentStatus: null, isUnassigned: true, spend: null, totalLeads: 1, closures: 1, costPerClosure: null }),
];

function table(rows: readonly AdClosureSummary[] | undefined = summaries): string {
  return renderToStaticMarkup(createElement(AdClosuresSourceTable, { adClosures: rows, closureRange: range, formatAdLabel: formatAdName }));
}

test("closure CPA uses the 1500/3000 business bands rather than the 80/120 lead-cost bands", () => {
  assert.equal(getClosureCostColor(120), "green");
  assert.equal(getClosureCostColor(1500), "green");
  assert.equal(getClosureCostColor(1500.01), "orange");
  assert.equal(getClosureCostColor(2207.72), "orange");
  assert.equal(getClosureCostColor(3000), "orange");
  assert.equal(getClosureCostColor(3000.01), "red");
  assert.equal(getClosureCostColor(null), "neutral");
  assert.equal(getClosureCostColor(-1), "neutral");
});

test("a closed-ad closure band distinguishes fixed30 data, observed positive counts and unavailable partial zeros", () => {
  const positive = renderToStaticMarkup(createElement(AdClosureBand, { summary: summary(), range }));
  assert.ok(positive.includes("סגירות ב־30 יום"));
  assert.ok(positive.includes("מלידים שנקלטו בטווח"));
  assert.ok(positive.includes(formatCplCurrency(2207.72)));
  assert.ok(positive.includes("bg-emerald-100"), "positive closures remain a green count even when their CPA is only reasonable");
  const partial = renderToStaticMarkup(createElement(AdClosureBand, { summary: summary({ complete: false, closures: 1 }), range }));
  assert.ok(partial.includes("לפחות 1"));
  assert.ok(!partial.includes(formatCplCurrency(2207.72)), "partial closure CPA is not presented as known");
  const unavailable = renderToStaticMarkup(createElement(AdClosureBand, { summary: summary({ complete: false, closures: 0 }), range }));
  assert.ok(unavailable.includes("לא זמין"));
  assert.doesNotMatch(unavailable, />0</);
  const zero = renderToStaticMarkup(createElement(AdClosureBand, { summary: summary({ closures: 0, costPerClosure: null }), range }));
  assert.match(zero, />0</);
  assert.ok(!zero.includes("bg-emerald-100"), "a confirmed zero is neutral, not a positive badge or pause recommendation");
  assert.ok(renderToStaticMarkup(createElement(AdClosureBand, {})).includes("לא זמין"));
});

test("the source table exposes paused winners with identical ad names separately and never assigns unknown closures to a real ad", () => {
  const html = table();
  const body = html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? "";
  const rows = [...body.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map((match) => match[0]);
  assert.equal(rows.length, 3, "only positive closure rows belong in the source table");
  assert.ok(rows[0].includes("טופס רגיל"));
  assert.ok(rows[1].includes("שלוש שאלות"));
  assert.equal((body.match(/>מודעה 2<\/th>/g) ?? []).length, 2, "equal ad names in different series must not merge");
  assert.ok(rows[0].includes('/creative/ad-a'));
  assert.ok(rows[1].includes('/creative/ad-b'));
  assert.ok(rows[1].includes("הסדרה סגורה"));
  assert.ok(!rows[1].includes(">פעילה<"), "an active local ad is not shown as delivering when its parent is paused");
  assert.ok(!html.includes("מודעה בלי סגירות"));
  assert.ok(rows[2].includes("לידים ללא שיוך למודעה"));
  assert.ok(!rows[2].includes("מודעה לידים ללא שיוך"));
  assert.doesNotMatch(rows[2], /href=/);
  assert.ok(html.includes("13.10.2026 — 11.11.2026"));
  assert.ok(html.includes("הרשמות מלידים שנקלטו בטווח"));
  assert.doesNotMatch(html, /<button\b/, "the closure source table contains no pause or scaling actions");
});

test("missing or partial source data is not reported as zero closures", () => {
  const partial = table([summary({ complete: false, closures: 0 })]);
  assert.ok(partial.includes("נתוני הסגירות חלקיים"));
  assert.ok(!partial.includes("לא נרשמו סגירות"));
  const missing = renderToStaticMarkup(createElement(AdClosuresSourceTable, { formatAdLabel: formatAdName }));
  assert.ok(missing.includes("אינם זמינים"));
  const loading = renderToStaticMarkup(createElement(AdClosuresSourceTable, { adClosures: summaries, closuresLoading: true, formatAdLabel: formatAdName }));
  assert.ok(loading.includes("טוען מקור סגירות"));
  assert.doesNotMatch(loading, /<table\b/);
});

const campaign: Campaign = {
  id: "closures-campaign", name: "קמפיין מקור סגירות", status: "active", objective: "Leads",
  adSets: [
    { id: "set-a", name: "טופס רגיל", campaignId: "closures-campaign", status: "active", ads: [{ id: "ad-a", name: "2", adSetId: "set-a", status: "active", destinationType: "meta_standard_form", metrics: { spend: 0, impressions: 0, reach: 0, linkClicks: 0, leads: 0, sales: 0, revenue: 0 } }] },
    { id: "set-b", name: "שלוש שאלות", campaignId: "closures-campaign", status: "paused", ads: [{ id: "ad-b", name: "2", adSetId: "set-b", status: "active", destinationType: "meta_standard_form", metrics: { spend: 0, impressions: 0, reach: 0, linkClicks: 0, leads: 0, sales: 0, revenue: 0 } }] },
  ],
};
const selected = buildLeadQualityReport({ campaigns: [campaign], leads: [], range: { since: "2026-11-11", until: "2026-11-11" } });
const assessment: CampaignScaleAssessment = { campaignId: campaign.id, candidate: true, status: "review", action: "review", tier: "reasonable", score: 60, badge: { label: "סקייל לבדיקה", color: "orange" }, range, basis: SCALE_COHORT_BASIS, spend: 5515.44, registrations: 4, cpa: 1378.86, qualityRates: { relevant: 100, irrelevant: 0, undetermined: 0 }, confidence: "moderate", sampleNote: "מדגם לבדיקה", dataComplete: true, reasons: [], increasePercent: null, budgetMode: "unknown", budgetTargets: [], adClosures: summaries };

test("selected-period zero metrics do not replace an active ad's own fixed30 closure band", () => {
  const html = renderToStaticMarkup(createElement(CampaignAdList, { campaign: selected.campaigns[0], groups: selected.groups, showZero: false, adClosures: summaries, closureRange: range }));
  assert.ok(html.includes("סגירות ב־30 יום"));
  assert.ok(html.includes(formatCplCurrency(2207.72)), "the visible ad resolves its summary by ID, not the duplicate display name");
  assert.ok(!html.includes(formatCplCurrency(1100)), "the paused parent's child stays unmounted in the normal ad list");
  assert.doesNotMatch(html, /<table\b/);
  assert.match(html, /aria-expanded="false"/);
});

test("opening a campaign reveals the fixed30 closure source even before its ordinary ad list opens", () => {
  const html = renderToStaticMarkup(createElement(CampaignQualityCard, { campaign: selected.campaigns[0], groups: selected.groups, expanded: true, onToggle: () => {}, showZero: false, scale: assessment }));
  assert.ok(html.includes("מקור הסגירות • 30 יום"));
  assert.ok(html.includes('/creative/ad-b'), "a winning ad under a paused parent must be discoverable without expanding inactive series");
  assert.ok(html.includes("הסדרה סגורה"));
  assert.ok(html.includes("הצג מודעות"));
  assert.ok(!html.includes("סגירות ב־30 יום"), "normal ad cards remain unmounted until their separate disclosure opens");
});
