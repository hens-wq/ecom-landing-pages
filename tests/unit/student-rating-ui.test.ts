import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AdSetQualitySection, CampaignAdList, CampaignQualityCard, QualitySummary } from "@/components/lead-quality/quality-cards";
import { CampaignScaleBadge, CampaignScaleRecommendation } from "@/components/lead-quality/scale-recommendation";
import { StudentRatingSummary } from "@/components/lead-quality/student-rating-summary";
import { StudentRatingFlames, StudentRatingLegend } from "@/components/leads/student-rating";
import { buildLeadQualityReport } from "@/lib/lead-quality";
import { formatCplCurrency } from "@/lib/lead-quality/presentation";
import { SCALE_COHORT_BASIS, type CampaignScaleAssessment } from "@/lib/lead-quality/scale";
import type { LeadQualityAd, LeadQualityAdSet, LeadQualityCampaign, LeadStudentRatingSummary } from "@/lib/lead-quality/types";

function summary(complete = true): LeadStudentRatingSummary {
  const metric = (count: number) => ({ count, percent: count * 10 });
  return {
    ordinary: metric(4), excellent: metric(5), cold: metric(1), unrated: metric(0), rated: metric(10),
    byRating: { "1": metric(1), "2": metric(2), "3": metric(2), "4": metric(3), "5": metric(2) },
    costPerExcellent: 200, complete,
  };
}

function text(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function valueFor(html: string, label: string): string {
  const value = html.match(new RegExp(`<dt[^>]*>${label}<\\/dt>\\s*<dd[^>]*>([\\s\\S]*?)<\\/dd>`));
  assert.ok(value, `missing metric: ${label}`);
  return text(value[1]);
}

test("CRM flame ratings distinguish ordinary 2/3, excellent 4/5 and legacy cold while missing renders exactly two flames", () => {
  for (const rating of [2, 3]) {
    const html = renderToStaticMarkup(createElement(StudentRatingFlames, { rating }));
    assert.ok(html.includes(`דירוג תלמיד ${rating} מתוך 5, רגיל`));
    assert.equal((html.match(/<svg\b/g) ?? []).length, rating);
  }
  for (const rating of [4, 5]) assert.ok(renderToStaticMarkup(createElement(StudentRatingFlames, { rating })).includes(`דירוג תלמיד ${rating} מתוך 5, מצוין`));
  assert.ok(renderToStaticMarkup(createElement(StudentRatingFlames, { rating: 1 })).includes("קר, דירוג היסטורי"));
  const missing = renderToStaticMarkup(createElement(StudentRatingFlames, { rating: null }));
  const ordinary = renderToStaticMarkup(createElement(StudentRatingFlames, { rating: 2 }));
  assert.equal(missing, ordinary);
  assert.equal(renderToStaticMarkup(createElement(StudentRatingFlames, { rating: undefined })), ordinary);
  assert.equal((missing.match(/<svg\b/g) ?? []).length, 2);
  assert.ok(!missing.includes("ללא דירוג"));
  const zero = renderToStaticMarkup(createElement(StudentRatingFlames, { rating: 0 }));
  assert.ok(zero.includes("ערך דירוג לא מוכר: 0"));
  assert.ok(!zero.includes("ללא דירוג"));
  const legend = text(renderToStaticMarkup(createElement(StudentRatingLegend)));
  assert.ok(legend.includes("2–3 להבות · רגיל") && legend.includes("4–5 להבות · מצוין"));
  assert.ok(!legend.includes("ללא דירוג"));
});

test("the compact strip exposes a separate percentage for every 2/3/4/5 flame level without grouped cards or a hidden breakdown", () => {
  const html = renderToStaticMarkup(createElement(StudentRatingSummary, { summary: summary(), totalLeads: 10, leadsKnown: true }));
  assert.match(html, /<section\b[^>]*dir="rtl"/);
  assert.equal(valueFor(html, "2 להבות"), "20% 2 לידים");
  assert.equal(valueFor(html, "3 להבות"), "20% 2 לידים");
  assert.equal(valueFor(html, "4 להבות"), "30% 3 לידים");
  assert.equal(valueFor(html, "5 להבות"), "20% 2 לידים");
  assert.equal(valueFor(html, "להבה אחת · היסטורי"), "10% 1 לידים");
  assert.ok(html.includes(formatCplCurrency(200)));
  assert.doesNotMatch(html, /<details\b|פירוט לפי להבות|נכללו בחישוב|רגילים ·|מצוינים ·/);
  assert.doesNotMatch(html, /<table\b/, "the compact rating strip does not mount a secondary-status table");
  assert.ok(!html.includes("נתונים לא זמינים"), "an empty technical-unavailable bucket does not add a summary card");
  assert.ok(!html.includes("ללא דירוג"));
});

test("invalid or technically unavailable ratings remain lower bounds out of all ten leads and withhold acquisition cost", () => {
  const rating = summary(false);
  rating.ordinary = { count: 2, percent: 20 };
  rating.excellent = { count: 3, percent: 30 };
  rating.rated = { count: 6, percent: 60 };
  rating.unrated = { count: 4, percent: 40 };
  rating.byRating = { "1": { count: 1, percent: 10 }, "2": { count: 1, percent: 10 }, "3": { count: 1, percent: 10 }, "4": { count: 2, percent: 50 }, "5": { count: 1, percent: 10 } };
  const html = renderToStaticMarkup(createElement(StudentRatingSummary, { summary: rating, totalLeads: 10, leadsKnown: true }));
  assert.equal(valueFor(html, "4 להבות"), "לפחות 20% לפחות 2 לידים", "two of ten incoming leads must not become 50% of a smaller rated subset");
  assert.equal(valueFor(html, "נתונים לא זמינים"), "40% 4 לידים");
  assert.ok(!html.includes(formatCplCurrency(200)), "an incomplete cost is withheld even if a stale numeric cost is provided");
});

test("a completely unavailable rating source never looks like confirmed zero excellent leads", () => {
  const rating = summary(false);
  for (const metric of [rating.ordinary, rating.excellent, rating.cold, rating.rated, ...Object.values(rating.byRating)]) {
    metric.count = 0;
    metric.percent = 0;
  }
  rating.unrated = { count: 10, percent: 100 };
  const html = renderToStaticMarkup(createElement(StudentRatingSummary, { summary: rating, totalLeads: 10, leadsKnown: true }));
  assert.equal(valueFor(html, "4 להבות"), "— לא ידוע");
  assert.equal(valueFor(html, "נתונים לא זמינים"), "100% 10 לידים");
  assert.ok(!html.includes("טרם התקבלו דירוגי תלמידים"));
  assert.ok(!html.includes("ללא דירוג"));
  assert.ok(!html.includes("להבה אחת · היסטורי"));
  assert.ok(!html.includes("דירוג תלמיד 1 מתוך 5"), "one flame is legacy-only and is absent when no such rating was recorded");
  const unavailable = renderToStaticMarkup(createElement(StudentRatingSummary, { totalLeads: 0, leadsKnown: false }));
  assert.ok(unavailable.includes("אינם זמינים"));
  assert.ok(!unavailable.includes("0%"));
  const unknownSources = renderToStaticMarkup(createElement(StudentRatingSummary, { summary: summary(false), totalLeads: 10, leadsKnown: false }));
  assert.ok(valueFor(unknownSources, "4 להבות").startsWith("—"), "an observed count cannot produce a percentage when the full source denominator is unknown");
});

test("a fully defaulted two-flame cohort is ordinary, complete and has no missing-data or legacy-cold card", () => {
  const rating = summary();
  rating.ordinary = { count: 10, percent: 100 };
  rating.excellent = { count: 0, percent: 0 };
  rating.cold = { count: 0, percent: 0 };
  rating.costPerExcellent = null;
  rating.byRating = {
    "1": { count: 0, percent: 0 }, "2": { count: 10, percent: 100 }, "3": { count: 0, percent: 0 },
    "4": { count: 0, percent: 0 }, "5": { count: 0, percent: 0 },
  };
  const html = renderToStaticMarkup(createElement(StudentRatingSummary, { summary: rating, totalLeads: 10, leadsKnown: true }));
  assert.equal(valueFor(html, "2 להבות"), "100% 10 לידים");
  for (const level of [3, 4, 5]) assert.equal(valueFor(html, `${level} להבות`), "0% 0 לידים");
  assert.ok(!html.includes("נתונים לא זמינים"));
  assert.ok(!html.includes("להבה אחת · היסטורי"));
  assert.ok(!html.includes("טרם ידוע"));
  assert.ok(!html.includes("עם דירוג:"), "defaulted ratings must not be described as received CRM data");
  assert.ok(!html.includes("נכללו בחישוב:"));
});

const qualityOnly: CampaignScaleAssessment = {
  campaignId: "rating-only", candidate: false, status: "review", action: "review", tier: "none", score: 20,
  badge: { label: "לידים מצוינים", color: "green" }, range: { since: "2026-10-14", until: "2026-11-12" }, basis: SCALE_COHORT_BASIS,
  spend: 1000, registrations: 0, cpa: null, qualityRates: { relevant: 0, irrelevant: 100, undetermined: 0 },
  confidence: "limited", sampleNote: "", dataComplete: true, reasons: ["נמצאו לידים בדירוג 4–5."],
  increasePercent: null, budgetMode: "campaign_daily", budgetTargets: [], studentRating: summary(),
};

test("excellent leads without any enrollment get a fixed-30-day quality badge and evidence, with no budget raise", () => {
  const badge = renderToStaticMarkup(createElement(CampaignScaleBadge, { assessment: qualityOnly, expanded: false, panelId: "campaign", onOpen: () => {} }));
  assert.match(badge, /<button\b[^>]*aria-controls="campaign"/);
  assert.ok(badge.includes("לידים מצוינים"));
  const html = renderToStaticMarkup(createElement(CampaignScaleRecommendation, { assessment: qualityOnly }));
  assert.ok(html.includes("ב־30 הימים האחרונים"));
  assert.ok(html.includes("14.10.2026 — 12.11.2026"));
  assert.ok(html.includes("ללא תלות בטווח התצוגה"));
  assert.ok(html.includes("ללא הרשמות לא מוצעת הגדלת תקציב מספרית"));
  assert.ok(!html.includes("תקציב יומי מוצע"));
  const ordinaryOnly = { ...qualityOnly, studentRating: { ...summary(), excellent: { count: 0, percent: 0 } } };
  assert.equal(renderToStaticMarkup(createElement(CampaignScaleBadge, { assessment: ordinaryOnly, expanded: false, panelId: "campaign", onOpen: () => {} })), "");
});

test("rating quality never replaces the recorded invalid-status summary or invents an enrollment", () => {
  const report = buildLeadQualityReport({ campaigns: [], leads: [], range: { since: "2026-11-12", until: "2026-11-12" } });
  const row = report.totals;
  row.totalLeads = 10;
  row.summary.irrelevant = { count: 10, percent: 100 };
  row.summary.sales = { count: 0, percent: 0 };
  row.summary.studentRating = summary();
  const html = renderToStaticMarkup(createElement(QualitySummary, { row }));
  assert.match(html, /לידים לא רלוונטיים[\s\S]*?<bdi dir="ltr">10 \(100%\)<\/bdi>/);
  assert.match(html, /סגירות[\s\S]*?<bdi dir="ltr">0 \(0%\)<\/bdi>/);
  assert.equal(valueFor(html, "4 להבות"), "30% 3 לידים");
});

function overviewCampaign(rating: LeadStudentRatingSummary | undefined = summary(), totalLeads = 10): LeadQualityCampaign {
  const base = buildLeadQualityReport({ campaigns: [], leads: [], range: { since: "2026-11-12", until: "2026-11-12" } }).totals;
  return { ...base, id: "cooperation-campaign", name: "קמפיין שיתוף פעולה", level: "campaign", status: "active", totalLeads, summary: { ...base.summary, studentRating: rating }, adSets: [], ads: [] };
}

function renderOverview(campaign: LeadQualityCampaign): string {
  return renderToStaticMarkup(createElement(CampaignQualityCard, { campaign, groups: [], expanded: false, onToggle: () => {}, showZero: false, scale: { ...qualityOnly, studentRating: { ...summary(), cooperation: { count: 10, percent: 100 } } } }));
}

test("a closed campaign shows cooperation from 3+4+5 over its selected cohort, independent of fixed30 scale data", () => {
  const html = renderOverview(overviewCampaign());
  assert.equal(valueFor(html, "אחוז שיתוף פעולה"), "70%", "three-flame ordinary leads are included alongside four/five, while two and legacy-one are excluded");
  assert.match(html, /aria-expanded="false"/);
  assert.doesNotMatch(html, /<table\b|<dt\b[^>]*>[2345] להבות/);
});

test("an ad overview and a closed series each use their own incoming cohort rather than the campaign denominator", () => {
  const campaign = overviewCampaign();
  const rating = summary();
  rating.cold = { count: 0, percent: 0 };
  rating.byRating = { "1": { count: 0, percent: 0 }, "2": { count: 1, percent: 25 }, "3": { count: 1, percent: 25 }, "4": { count: 2, percent: 50 }, "5": { count: 0, percent: 0 } };
  const ad: LeadQualityAd = { ...campaign, id: "own-cohort-ad", name: "1", level: "ad", campaignId: campaign.id, adSetId: "own-set", adSetName: "סדרה", totalLeads: 4, summary: { ...campaign.summary, studentRating: rating } };
  const adSet: LeadQualityAdSet = { ...campaign, id: "own-set", name: "סדרה", level: "adset", campaignId: campaign.id, adIds: [ad.id], unassignedLeadCount: 0, summary: { ...campaign.summary, studentRating: rating }, totalLeads: 4 };
  campaign.adSets = [adSet];
  campaign.ads = [ad];
  const adsHtml = renderToStaticMarkup(createElement(CampaignAdList, { campaign, groups: [], showZero: false }));
  assert.equal(valueFor(adsHtml, "אחוז שיתוף פעולה"), "75%");
  assert.match(adsHtml, /aria-expanded="false"/);
  const seriesHtml = renderToStaticMarkup(createElement(AdSetQualitySection, { adSet: { ...adSet, status: "paused", totalLeads: 6 }, ads: [ad], groups: [], showZero: false }));
  assert.equal(valueFor(seriesHtml, "אחוז שיתוף פעולה"), "50%");
  assert.ok(!seriesHtml.includes("מודעה 1"), "series children stay unmounted while its overview is closed");
});

test("cooperation never invents a percentage for missing summaries, unknown lead sources or an empty denominator", () => {
  const missing = overviewCampaign();
  delete missing.summary.studentRating;
  assert.equal(valueFor(renderOverview(missing), "אחוז שיתוף פעולה"), "לא זמין");
  assert.equal(valueFor(renderOverview({ ...overviewCampaign(), leadsKnown: false }), "אחוז שיתוף פעולה"), "לא זמין");
  assert.equal(valueFor(renderOverview(overviewCampaign(summary(), 0)), "אחוז שיתוף פעולה"), "לא זמין");
  assert.equal(valueFor(renderOverview(overviewCampaign(summary(false))), "אחוז שיתוף פעולה"), "לפחות 70%");
  const noKnownCooperation = summary(false);
  for (const level of ["3", "4", "5"] as const) noKnownCooperation.byRating[level] = { count: 0, percent: 0 };
  assert.equal(valueFor(renderOverview(overviewCampaign(noKnownCooperation)), "אחוז שיתוף פעולה"), "לא זמין");
});
