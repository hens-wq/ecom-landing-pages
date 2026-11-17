import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CampaignQualityCard } from "@/components/lead-quality/quality-cards";
import { buildLeadQualityReport } from "@/lib/lead-quality";
import type { LeadFact } from "@/lib/performance/types";
import type { Campaign } from "@/lib/types";

const CAMPAIGN_NAME = "קמפיין לבדיקת פתיחה מדורגת";
const AD_NAME = "מודעה שנחשפת רק בפתיחת רשימת המודעות";
const JOB_REASON = "ליד שגוי - חשב/ה מדובר בעבודה";
const campaign: Campaign = {
  id: "disclosure-campaign", name: CAMPAIGN_NAME, status: "active", objective: "Leads",
  adSets: [{
    id: "disclosure-adset", name: "סדרת בדיקה", campaignId: "disclosure-campaign", status: "active",
    ads: [{
      id: "disclosure-ad", name: AD_NAME, adSetId: "disclosure-adset", status: "active", destinationType: "meta_standard_form",
      metrics: { spend: 400, impressions: 1000, reach: 750, linkClicks: 30, leads: 0, sales: 0, revenue: 0 },
    }],
  }],
};
const leads: LeadFact[] = Array.from({ length: 5 }, (_, index) => ({
  id: `disclosure-lead-${index}`,
  sourceType: "meta_standard_form",
  leadDate: "2026-11-04",
  campaignId: campaign.id,
  adSetId: "disclosure-adset",
  adId: "disclosure-ad",
  statusKnown: true,
  mainStatus: index === 0 ? "ליד שגוי" : "חדש",
  secondaryStatus: index === 0 ? JOB_REASON : "חדש",
  fullPaymentAmount: null,
  partialPaymentAmount: null,
}));
const report = buildLeadQualityReport({ campaigns: [campaign], leads, range: { since: "2026-11-01", until: "2026-11-07" } });

function renderCampaign(expanded: boolean): string {
  return renderToStaticMarkup(createElement(CampaignQualityCard, {
    campaign: report.campaigns[0], groups: report.groups, expanded, onToggle: () => {}, showZero: false,
  }));
}

function innerText(markup: string): string {
  return markup.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

test("a closed campaign exposes its overview only, without mounting statuses, summaries or ad names", () => {
  const html = renderCampaign(false);
  assert.ok(html.includes(CAMPAIGN_NAME));
  assert.ok(html.includes("סכום שהוצא"));
  assert.ok(html.includes("עלות לליד"));
  assert.match(html, /<button\b[^>]*aria-expanded="false"/);
  assert.doesNotMatch(html, /<table\b/);
  assert.ok(!html.includes(JOB_REASON), "secondary-status details are not mounted behind a visually hidden panel");
  assert.ok(!html.includes("לידים רלוונטיים"), "quality summaries belong inside the disclosure");
  assert.ok(!html.includes("הסיבה הנפוצה ביותר"));
  assert.ok(!html.includes(AD_NAME), "the ad list is not mounted while the campaign is closed");
});

test("opening a campaign reveals the RTL secondary-status table and its summary while its ad list stays closed", () => {
  const html = renderCampaign(true);
  assert.match(html, /<button\b[^>]*aria-expanded="true"/);
  assert.match(html, /<table\b[^>]*dir="rtl"/);
  const headers = [...html.matchAll(/<th\b[^>]*>[\s\S]*?<\/th>/g)].map((match) => innerText(match[0]));
  assert.ok(headers.some((header) => header.includes(JOB_REASON)), "the metric column is the full recorded secondary status");
  const secondaryHeaders = [...html.matchAll(/<th\b[^>]*scope="col"[^>]*>[\s\S]*?<\/th>/g)].map((match) => innerText(match[0]));
  assert.equal(secondaryHeaders.length, 2, "the five-lead cohort has exactly two observed secondary statuses; empty parent groups do not create metric columns");
  assert.ok(secondaryHeaders.some((header) => header.startsWith("חדש")));
  assert.ok(secondaryHeaders.some((header) => header.startsWith(JOB_REASON)));
  assert.ok(secondaryHeaders.every((header) => !header.includes("ללא לידים")), "parent grouping labels must not gain a synthetic zero-count metric");
  assert.match(html, /<bdi\b[^>]*dir="ltr"[^>]*>\s*1\s*\(20%\)\s*<\/bdi>/, "one of five campaign leads is displayed as count (percentage), isolated from RTL direction");
  assert.ok(html.includes("לידים רלוונטיים"));
  const buttonTexts = [...html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].map((match) => innerText(match[0]));
  assert.ok(buttonTexts.some((text) => /(?:פתח|הצג|פתיח).{0,45}מודעות/.test(text)), "the ad list has a separate disclosure control");
  assert.ok(!html.includes(AD_NAME), "opening a campaign does not eagerly expand its ad list");
});
