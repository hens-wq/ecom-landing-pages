import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AdSetQualitySection, CampaignAdList, visibleAdsForAdSet } from "@/components/lead-quality/quality-cards";
import { formatCurrency } from "@/lib/format";
import { buildLeadQualityReport } from "@/lib/lead-quality";
import type { LeadQualityAd, LeadQualityAdSet } from "@/lib/lead-quality/types";
import type { LeadFact } from "@/lib/performance/types";
import type { Ad, Campaign } from "@/lib/types";

function ad(id: string, adSetId: string, status: Ad["status"], spend: number): Ad {
  return { id, name: id, adSetId, status, destinationType: "meta_standard_form", metrics: { spend, impressions: 100, reach: 90, linkClicks: 5, leads: 0, sales: 0, revenue: 0 } };
}

const campaign: Campaign = {
  id: "visibility-campaign", name: "קמפיין תצוגה", status: "active", objective: "Leads",
  adSets: [
    { id: "active-set", name: "סדרה פעילה", campaignId: "visibility-campaign", status: "active", ads: [ad("מודעה פעילה בסדרה פעילה", "active-set", "active", 80), ad("מודעה כבויה בסדרה פעילה", "active-set", "paused", 120)] },
    { id: "closed-set", name: "סדרה כבויה", campaignId: "visibility-campaign", status: "paused", ads: [ad("מודעה מקומית פעילה בהורה כבוי", "closed-set", "active", 40), ad("מודעה מקומית כבויה בהורה כבוי", "closed-set", "paused", 50)] },
    { id: "empty-closed-set", name: "סדרה כבויה וריקה", campaignId: "visibility-campaign", status: "ended", ads: [] },
  ],
};
const leads: LeadFact[] = [
  ...campaign.adSets.flatMap((adSet) => adSet.ads.map((entry) => ({ id: `lead-${entry.id}`, campaignId: campaign.id, adSetId: adSet.id, adId: entry.id }))),
  { id: "set-only-lead", campaignId: campaign.id, adSetId: "closed-set", adId: null },
].map((entry) => ({ ...entry, sourceType: "meta_standard_form", leadDate: "2026-11-04", statusKnown: true, mainStatus: "חדש", secondaryStatus: "חדש", fullPaymentAmount: null, partialPaymentAmount: null }));
const report = buildLeadQualityReport({ campaigns: [campaign], leads, range: { since: "2026-11-01", until: "2026-11-07" } });
const row = report.campaigns[0];
const canonical = new Map(row.ads.map((entry) => [entry.id, entry]));

function resolve(adSet: LeadQualityAdSet): LeadQualityAd[] {
  return adSet.adIds.flatMap((id) => { const entry = canonical.get(id); return entry ? [entry] : []; });
}

function renderSet(adSet: LeadQualityAdSet): string {
  return renderToStaticMarkup(createElement(AdSetQualitySection, { adSet, ads: resolve(adSet), groups: report.groups, showZero: false }));
}

function text(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

test("an active series displays only locally active real ads, with each ad still collapsed", () => {
  const html = renderSet(row.adSets[0]);
  assert.ok(html.includes("סדרת מודעות: סדרה פעילה"));
  assert.ok(html.includes("מודעה פעילה בסדרה פעילה"));
  assert.ok(!html.includes("מודעה כבויה בסדרה פעילה"));
  assert.match(html, /<button\b[^>]*aria-expanded="false"/);
  assert.doesNotMatch(html, /<table\b/);
  assert.ok(!html.includes("לידים רלוונטיים"));
  assert.deepEqual(visibleAdsForAdSet(row.adSets[0], resolve(row.adSets[0])).map((entry) => entry.id), ["מודעה פעילה בסדרה פעילה"]);
  assert.equal(row.adSets[0].totalLeads, 2, "default child visibility must not filter the full-cohort series metrics");
  assert.equal(row.totalLeads, 5, "campaign summaries still include paused ads and set-only leads");
});

test("inactive series use the actual parent status, stay closed, and retain complete period metrics", () => {
  const adSet = row.adSets[1];
  const html = renderSet(adSet);
  assert.match(html, /<button\b[^>]*aria-expanded="false"/);
  assert.ok(text(html).includes("סדרת מודעות: סדרה כבויה סגורה"));
  assert.ok(html.includes(formatCurrency(90)), "the overview includes both locally active and paused child spend");
  assert.ok(html.includes(formatCurrency(30)), "CPL uses all three series leads, including the set-only lead");
  assert.ok(!html.includes("מודעה מקומית פעילה בהורה כבוי"));
  assert.ok(!html.includes("מודעה מקומית כבויה בהורה כבוי"));
  assert.deepEqual(visibleAdsForAdSet(adSet, resolve(adSet)).map((entry) => entry.id), adSet.adIds, "opening an inactive parent must expose all its real ads, including active local statuses");
  const emptyHtml = renderSet(row.adSets[2]);
  assert.ok(text(emptyHtml).includes("סדרת מודעות: סדרה כבויה וריקה סגורה"));
  assert.match(emptyHtml, /aria-expanded="false"/);
  assert.ok(emptyHtml.includes("סכום שהוצא"));
  assert.ok(emptyHtml.includes("סך הלידים"));
  assert.equal(row.adSets[2].adIds.length, 0);
});

test("unknown series status is not called closed and unassigned lead rows remain separate once", () => {
  const unknownSet = { ...row.adSets[1], status: null };
  const unknownHtml = renderSet(unknownSet);
  assert.ok(unknownHtml.includes("סטטוס לא ידוע"));
  assert.ok(!text(unknownHtml).includes("סגורה"));
  const html = renderToStaticMarkup(createElement(CampaignAdList, { campaign: row, groups: report.groups, showZero: false }));
  const content = text(html);
  assert.equal(content.split("לידים ללא שיוך למודעה").length - 1, 1, "the combined lead-only row must not be duplicated inside its parent series");
  assert.ok(content.indexOf("סדרת מודעות: סדרה פעילה") < content.indexOf("סדרת מודעות: סדרה כבויה"));
  assert.ok(content.indexOf("סדרת מודעות: סדרה כבויה") < content.indexOf("סדרת מודעות: סדרה כבויה וריקה"));
  assert.ok(!html.includes("מודעה מקומית פעילה בהורה כבוי"));
  assert.ok(!html.includes("מודעה כבויה בסדרה פעילה"));
  assert.equal(row.ads.filter((entry) => entry.isUnassigned).length, 1);
});

test("the rendered list places active series first, neutral unknown series next, and closed series last without changing source order", () => {
  const empty = row.adSets[2];
  const set = (id: string, name: string, status: LeadQualityAdSet["status"]): LeadQualityAdSet => ({ ...empty, id, name, status });
  const source = [
    set("closed-first", "כבויה ראשונה במקור", "paused"),
    set("active-first", "פעילה ראשונה במקור", "active"),
    set("unknown-first", "לא ידועה ראשונה במקור", null),
    set("ended", "הסתיימה באמצע המקור", "ended"),
    set("active-second", "פעילה שנייה במקור", "active"),
    set("unknown-second", "לא ידועה שנייה במקור", null),
    set("closed-last", "כבויה אחרונה במקור", "paused"),
  ];
  const sourceIds = source.map((entry) => entry.id);
  Object.freeze(source);
  const html = renderToStaticMarkup(createElement(CampaignAdList, { campaign: { ...row, adSets: source, ads: [] }, groups: report.groups, showZero: false }));
  const displayedNames = [...html.matchAll(/<section\b[^>]*aria-label="סדרת מודעות: ([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(displayedNames, ["פעילה ראשונה במקור", "פעילה שנייה במקור", "לא ידועה ראשונה במקור", "לא ידועה שנייה במקור", "כבויה ראשונה במקור", "הסתיימה באמצע המקור", "כבויה אחרונה במקור"]);
  assert.deepEqual(source.map((entry) => entry.id), sourceIds, "display grouping must not sort or mutate the canonical source array");
});

function styleColor(style: string, property: string): string {
  const value = style.split(";").find((declaration) => declaration.startsWith(`${property}:`))?.slice(property.length + 1);
  assert.ok(value && /^#[0-9a-f]{6}$/i.test(value), `expected an explicit six-digit ${property} paint color in rendered overview`);
  return value;
}

function contrast(first: string, second: string): number {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("closed overview title, normal metrics and every CPL category retain readable contrast on their actual dark background", () => {
  const cplPaints: string[] = [];
  for (const cpl of [57, 95, 120, null]) {
    const html = renderSet({ ...row.adSets[1], cpl });
    const backgroundStyle = html.match(/<section\b[^>]*style="([^"]+)"/)?.[1];
    const titleStyle = html.match(/<button\b[^>]*style="([^"]+)"/)?.[1];
    const metricsStyle = html.match(/<dl\b[^>]*style="([^"]+)"/)?.[1];
    const cplStyle = html.match(/<dd\b[^>]*style="([^"]+)"/)?.[1];
    assert.ok(backgroundStyle && titleStyle && metricsStyle && cplStyle);
    const background = styleColor(backgroundStyle, "background-color");
    assert.ok(contrast(background, styleColor(titleStyle, "color")) >= 7, "the closed title must meet enhanced contrast, not disappear against the dark card");
    assert.ok(contrast(background, styleColor(metricsStyle, "color")) >= 7, "normal labels and metric values must remain high contrast");
    const cplPaint = styleColor(cplStyle, "color");
    assert.ok(contrast(background, cplPaint) >= 4.5, `CPL ${cpl} must meet WCAG normal-text contrast`);
    cplPaints.push(cplPaint);
    assert.match(html, /aria-expanded="false"/);
  }
  assert.equal(new Set(cplPaints).size, 4, "green, orange, red and unavailable CPL must retain distinct semantic colors");
});
