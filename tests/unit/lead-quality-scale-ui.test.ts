import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CampaignQualityCard } from "@/components/lead-quality/quality-cards";
import { CampaignScaleBadge, CampaignScaleRecommendation } from "@/components/lead-quality/scale-recommendation";
import { buildLeadQualityReport } from "@/lib/lead-quality";
import { formatCplCurrency } from "@/lib/lead-quality/presentation";
import { SCALE_COHORT_BASIS, type CampaignScaleAssessment } from "@/lib/lead-quality/scale";
import type { Campaign } from "@/lib/types";

const campaign: Campaign = {
  id: "scale-ui-campaign", name: "קמפיין לבדיקת סקייל", status: "active", objective: "Leads",
  adSets: [{ id: "scale-ui-set", name: "סדרת בדיקה", campaignId: "scale-ui-campaign", status: "active", ads: [{ id: "scale-ui-ad", name: "מודעת בדיקה", adSetId: "scale-ui-set", status: "active", destinationType: "meta_standard_form", metrics: { spend: 150, impressions: 300, reach: 250, linkClicks: 10, leads: 0, sales: 0, revenue: 0 } }] }],
};
const report = buildLeadQualityReport({ campaigns: [campaign], leads: [], range: { since: "2026-11-11", until: "2026-11-11" } });
const assessment: CampaignScaleAssessment = {
  campaignId: campaign.id, candidate: true, status: "candidate", action: "increase", tier: "excellent", score: 90,
  badge: { label: "מועמד לסקייל", color: "green" },
  range: { since: "2026-10-13", until: "2026-11-11" }, basis: SCALE_COHORT_BASIS,
  spend: 1500, registrations: 1, cpa: 1500, qualityRates: { relevant: 50, irrelevant: 25, undetermined: 25 },
  confidence: "limited", sampleNote: "ההמלצה מבוססת על הרשמה אחת, ולכן יש לבדוק הגדלה מדורגת.", dataComplete: true,
  reasons: ["נמצאה הרשמה בעלות סבירה בטווח הקבוע של 30 ימים."], increasePercent: 10, budgetMode: "campaign_daily",
  budgetTargets: [{ id: campaign.id, level: "campaign", name: campaign.name, currentDaily: 150, proposedDaily: 165, increaseDaily: 15, increasePercent: 10 }],
};

function renderCampaign(expanded: boolean, scale: CampaignScaleAssessment = assessment): string {
  return renderToStaticMarkup(createElement(CampaignQualityCard, { campaign: report.campaigns[0], groups: report.groups, expanded, onToggle: () => {}, showZero: false, scale }));
}

test("a one-registration candidate has a separate header button while campaign details remain collapsed", () => {
  const html = renderCampaign(false);
  const buttons = [...html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].map((match) => match[0]);
  assert.equal(buttons.length, 2, "campaign disclosure and scale badge must be separate accessible buttons");
  assert.ok(buttons.some((button) => button.includes("מועמד לסקייל")));
  assert.ok(buttons.every((button) => (button.match(/<button\b/g) ?? []).length === 1), "the badge must not be nested in the campaign button");
  assert.ok(buttons.every((button) => button.includes('aria-controls="lead-quality-campaign-scale-ui-campaign"')));
  assert.ok(!html.includes(assessment.reasons[0]));
  assert.doesNotMatch(html, /<table\b/);
});

test("clicking a scale badge opens a closed campaign but never closes an already-open campaign", () => {
  let calls = 0;
  const closed = CampaignScaleBadge({ assessment, expanded: false, panelId: "campaign-panel", onOpen: () => { calls += 1; } });
  assert.ok(closed && closed.type === "button");
  closed.props.onClick();
  assert.equal(calls, 1);
  const open = CampaignScaleBadge({ assessment, expanded: true, panelId: "campaign-panel", onOpen: () => { calls += 1; } });
  assert.ok(open && open.type === "button");
  open.props.onClick();
  assert.equal(calls, 1);
});

test("expanded scale details keep their fixed 30-day cohort and show actual daily-budget amounts and limited sample", () => {
  const html = renderCampaign(true);
  assert.ok(html.includes("13.10.2026 — 11.11.2026"));
  assert.ok(html.includes("30 הימים האחרונים, ללא תלות בטווח התצוגה"));
  assert.ok(html.includes("כולל היום, יום חלקי"));
  assert.ok(html.includes("הרשמות מלידים שנקלטו בטווח"));
  assert.ok(html.includes("עלות להרשמה מלידים שנקלטו בטווח"));
  assert.ok(html.includes(assessment.reasons[0]));
  assert.ok(html.includes("מדגם מוגבל"));
  assert.ok(html.includes(formatCplCurrency(1500)));
  assert.ok(html.includes("תקציב יומי נוכחי"));
  assert.ok(html.includes(formatCplCurrency(165)));
  assert.ok(html.includes("10%"));
  assert.ok(html.includes(formatCplCurrency(15)));
  const details = renderToStaticMarkup(createElement(CampaignScaleRecommendation, { assessment }));
  assert.doesNotMatch(details, /<button\b/, "the recommendation must remain read-only, without an apply action");
});

test("review candidates remain visible and a missing actual daily budget never becomes spend divided by 30", () => {
  const review: CampaignScaleAssessment = { ...assessment, status: "review", action: "review", tier: "reasonable", badge: { label: "סקייל לבדיקה", color: "orange" }, budgetMode: "unknown", budgetTargets: [] };
  const html = renderCampaign(true, review);
  assert.ok(html.includes("סקייל לבדיקה"));
  assert.ok(html.includes("לא התקבל תקציב יומי עדכני"));
  assert.ok(!html.includes("תקציב יומי נוכחי"));
  assert.ok(!html.includes(formatCplCurrency(50)), "a daily budget must not be fabricated from the 30-day spend");
  const orangeCandidate = renderToStaticMarkup(createElement(CampaignScaleBadge, { assessment: { ...assessment, tier: "reasonable", badge: { label: "מועמד לסקייל", color: "orange" } }, expanded: false, panelId: "panel", onOpen: () => {} }));
  assert.ok(orangeCandidate.includes("bg-amber-50"), "the provided policy color governs the badge, including reasonable-CPA candidates");
  const economicReview = renderToStaticMarkup(createElement(CampaignScaleRecommendation, { assessment: { ...review, tier: "expensive", budgetMode: "campaign_daily" } }));
  assert.ok(!economicReview.includes("לא התקבל תקציב יומי עדכני"), "withholding a raise for review must not turn a known budget into unavailable data");
});

test("zero-registration results produce no badge while loading, failure and missing assessments remain explicitly unknown", () => {
  const none: CampaignScaleAssessment = { ...assessment, candidate: false, status: "none", action: "wait", registrations: 0, cpa: null, increasePercent: null, budgetTargets: [] };
  assert.equal(renderToStaticMarkup(createElement(CampaignScaleBadge, { assessment: none, expanded: false, panelId: "panel", onOpen: () => {} })), "");
  assert.equal(renderToStaticMarkup(createElement(CampaignScaleRecommendation, { assessment: none })), "");
  const loading = renderToStaticMarkup(createElement(CampaignScaleBadge, { loading: true, expanded: false, panelId: "panel", onOpen: () => {} }));
  assert.ok(loading.includes("בודק סקייל"));
  const error = renderToStaticMarkup(createElement(CampaignScaleRecommendation, { error: true }));
  assert.ok(error.includes("לא ניתן לקבוע"));
  const missing = renderToStaticMarkup(createElement(CampaignScaleRecommendation, {}));
  assert.ok(missing.includes("לא התקבלה בדיקת סקייל"));
  const unavailable = renderToStaticMarkup(createElement(CampaignScaleRecommendation, { assessment: { ...none, status: "unavailable", dataComplete: false } }));
  assert.ok(unavailable.includes("אינה זמינה"));
});

test("synthetic unattributed rows never receive campaign scale controls or missing-assessment notices", () => {
  const html = renderToStaticMarkup(createElement(CampaignQualityCard, { campaign: { ...report.campaigns[0], name: "לידים ללא שיוך לקמפיין", isUnassigned: true }, groups: report.groups, expanded: true, onToggle: () => {}, showZero: false, scaleLoading: true, scaleError: true, scale: assessment }));
  assert.ok(!html.includes("סקייל"));
});
