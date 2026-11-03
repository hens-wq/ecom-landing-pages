// Regression tests for the spend figures: the selected-period spend, the verified campaign exclusion, the unlisted spend, and
// the reconciliation with Meta's account total. Only synthetic fixtures are used. No names, phones or real account data.
import assert from "node:assert/strict";
import { test } from "node:test";

import { aggregateFlags, aggregateTotals, buildPerformanceTree } from "@/lib/aggregate";
import { mapMetaHierarchyToCampaigns } from "@/lib/advertising/meta/mapper";
import type { MetaAdInsightsRow, MetaAdNode, MetaAdSetNode, MetaCampaignNode } from "@/lib/advertising/meta/types";
import { buildSpendReconciliation, summedSpend } from "@/lib/advertising/reconciliation";
import { createCampaignScope, RECRUITMENT_NOT_EXCLUDED_MESSAGE } from "@/lib/campaign-scope";
import { sumScopedSpend } from "@/lib/performance/scope-spend";
import { spendNotices } from "@/lib/performance/spend-notices";
import { filterVisibleCampaignRows } from "@/lib/performance/visible-rows";
import type { Campaign, RawMetrics } from "@/lib/types";

const NO_METRICS: RawMetrics = { spend: 0, impressions: 0, reach: 0, linkClicks: 0, leads: 0, sales: 0, revenue: 0 };
const delivery = (spend: number, impressions: number): RawMetrics => ({ ...NO_METRICS, spend, impressions });

/** One course campaign with two ads: 100 and 50 of spend, 150 in total. */
const courseCampaigns: Campaign[] = [
  {
    id: "c-course",
    name: "קורס בדיקה",
    objective: "Meta Ads",
    status: "active",
    adSets: [
      {
        id: "as-1",
        name: "סדרה",
        campaignId: "c-course",
        status: "active",
        ads: [
          { id: "ad-1", name: "מודעה 1", adSetId: "as-1", status: "active", destinationType: "unknown", metrics: delivery(100, 1000) },
          { id: "ad-2", name: "מודעה 2", adSetId: "as-1", status: "paused", destinationType: "unknown", metrics: delivery(50, 500) },
        ],
      },
    ],
  },
];

/** Spend of an ad that Meta's listing no longer returns, for example an archived ad. */
const UNLISTED = delivery(50, 400);
const NO_FILTER = { campaignId: null, adSetId: null, adId: null, campaignStatus: null } as const;

test("reconciliation: ok when the course total equals the account total minus excluded spend", () => {
  const result = buildSpendReconciliation({
    campaigns: courseCampaigns,
    unlisted: null,
    excludedSpend: 200,
    accountSpend: { ok: true, spend: 350 },
  });
  assert.equal(result.status, "ok");
  assert.equal(result.summedSpend, 150);
  assert.equal(result.difference, 0);
});

test("reconciliation: a gap is reported with its size when the listing misses spend", () => {
  const result = buildSpendReconciliation({
    campaigns: courseCampaigns,
    unlisted: null,
    excludedSpend: 200,
    accountSpend: { ok: true, spend: 400 },
  });
  assert.equal(result.status, "gap");
  assert.equal(result.difference, 50);
  assert.match(result.message, /פער/);
});

test("reconciliation: unlisted delivery counts toward the sum, so it can close the gap", () => {
  const result = buildSpendReconciliation({
    campaigns: courseCampaigns,
    unlisted: UNLISTED,
    excludedSpend: 200,
    accountSpend: { ok: true, spend: 400 },
  });
  assert.equal(result.status, "ok");
  assert.equal(summedSpend(courseCampaigns, UNLISTED), 200);
});

test("reconciliation: unavailable, never a silent 'complete', when the account total cannot be read", () => {
  const result = buildSpendReconciliation({
    campaigns: courseCampaigns,
    unlisted: null,
    excludedSpend: 0,
    accountSpend: { ok: false, message: "Meta לא זמין כרגע." },
  });
  assert.equal(result.status, "unavailable");
  assert.equal(result.difference, null);
  assert.equal(result.accountSpend, null);
});

test("no double counting: parents equal their children, and unlisted spend enters the total once", () => {
  const rows = buildPerformanceTree(courseCampaigns, undefined, UNLISTED);
  assert.equal(aggregateTotals(rows).spend, 200);

  const course = rows.find((row) => row.id === "c-course");
  assert.ok(course);
  assert.equal(course.metrics.spend, 150);
  assert.equal(course.adSets[0].metrics.spend, 150);
  assert.equal(rows.filter((row) => row.isUnlisted).length, 1);
});

test("the unlisted row holds delivery but no lead figures, and it does not speak for lead data", () => {
  const rows = buildPerformanceTree(courseCampaigns, undefined, UNLISTED);
  const unlisted = rows.find((row) => row.isUnlisted);
  assert.ok(unlisted);
  assert.equal(unlisted.metrics.leads, 0);

  const flags = aggregateFlags(rows.map((row) => ({ ...row, leadsKnown: !row.isUnlisted })));
  assert.equal(flags.leadsKnown, true);
});

test("selected-period spend: an unfiltered scope includes unlisted spend exactly once", () => {
  const rows = buildPerformanceTree(courseCampaigns, undefined, UNLISTED);
  assert.equal(sumScopedSpend(rows, {}, NO_FILTER), 200);
});

test("selected-period spend: a campaign filter leaves out unlisted spend it cannot match", () => {
  const rows = buildPerformanceTree(courseCampaigns, undefined, UNLISTED);
  assert.equal(sumScopedSpend(rows, {}, { ...NO_FILTER, campaignId: "c-course" }), 150);
});

test("selected-period spend: the active filter drops unlisted spend, and the inactive filter keeps it", () => {
  const rows = buildPerformanceTree(courseCampaigns, undefined, UNLISTED);
  const statuses = { "c-course": "active" as const };
  assert.equal(sumScopedSpend(rows, statuses, { ...NO_FILTER, campaignStatus: "active" }), 150);
  assert.equal(sumScopedSpend(rows, statuses, { ...NO_FILTER, campaignStatus: "inactive" }), 50);
});

test("the active filter keeps a turned-off campaign that spent money, hides idle ones, and leaves totals unchanged", () => {
  const campaigns: Campaign[] = [
    ...courseCampaigns,
    {
      id: "c-ended",
      name: "קורס שהסתיים",
      objective: "Meta Ads",
      status: "paused",
      adSets: [
        {
          id: "as-2",
          name: "סדרה 2",
          campaignId: "c-ended",
          status: "paused",
          ads: [{ id: "ad-3", name: "מודעה 3", adSetId: "as-2", status: "paused", destinationType: "unknown", metrics: delivery(80, 800) }],
        },
      ],
    },
    {
      id: "c-idle",
      name: "קורס ללא הוצאה",
      objective: "Meta Ads",
      status: "paused",
      adSets: [
        {
          id: "as-3",
          name: "סדרה 3",
          campaignId: "c-idle",
          status: "paused",
          ads: [{ id: "ad-4", name: "מודעה 4", adSetId: "as-3", status: "paused", destinationType: "unknown", metrics: delivery(0, 0) }],
        },
      ],
    },
  ];
  const rows = buildPerformanceTree(campaigns, undefined, UNLISTED);
  const statuses = { "c-course": "active" as const, "c-ended": "paused" as const, "c-idle": "paused" as const };

  const visible = filterVisibleCampaignRows(rows, statuses, true);
  const ids = visible.map((row) => row.id);
  assert.ok(ids.includes("c-course"));
  assert.ok(ids.includes("c-ended"), "a turned-off campaign that spent money stays visible");
  assert.ok(!ids.includes("c-idle"), "an idle, turned-off campaign is hidden");
  assert.equal(aggregateTotals(visible).spend, aggregateTotals(rows).spend);
});

test("spend notices: demo data is never announced, and live data without a verified exclusion is", () => {
  assert.deepEqual(spendNotices({ reconciliation: null, unlistedSpend: 0, isLive: false, verifiedExclusions: false }), []);
  assert.deepEqual(spendNotices({ reconciliation: null, unlistedSpend: 0, isLive: true, verifiedExclusions: true }), []);

  const unverified = spendNotices({ reconciliation: null, unlistedSpend: 0, isLive: true, verifiedExclusions: false });
  assert.equal(unverified.length, 1);
  assert.equal(unverified[0].text, RECRUITMENT_NOT_EXCLUDED_MESSAGE);
});

test("spend notices: a gap and unlisted spend are each announced as a warning", () => {
  const gap = buildSpendReconciliation({
    campaigns: courseCampaigns,
    unlisted: null,
    excludedSpend: 0,
    accountSpend: { ok: true, spend: 170 },
  });
  const notices = spendNotices({ reconciliation: gap, unlistedSpend: 50, isLive: false });
  assert.equal(notices.length, 2);
  assert.ok(notices.every((notice) => notice.tone === "warning"));
});

test("the Meta mapper leaves excluded campaigns out, counts their spend apart, and never reads Meta lead counts as spend", () => {
  const scope = createCampaignScope([{ id: "c-recruit", name: "גיוס" }]);
  const campaignNodes = [
    { id: "c-course", name: "קורס", status: "ACTIVE", effective_status: "ACTIVE" },
    { id: "c-recruit", name: "גיוס", status: "ACTIVE", effective_status: "ACTIVE" },
  ] as MetaCampaignNode[];
  const adSetNodes = [
    { id: "as-1", name: "סדרה", campaign_id: "c-course", status: "ACTIVE", effective_status: "ACTIVE" },
    { id: "as-r", name: "סדרת גיוס", campaign_id: "c-recruit", status: "ACTIVE", effective_status: "ACTIVE" },
  ] as MetaAdSetNode[];
  const adNodes = [
    { id: "ad-1", name: "מודעה", adset_id: "as-1", campaign_id: "c-course", status: "ACTIVE", effective_status: "ACTIVE" },
    { id: "ad-r", name: "מודעת גיוס", adset_id: "as-r", campaign_id: "c-recruit", status: "ACTIVE", effective_status: "ACTIVE" },
  ] as MetaAdNode[];
  const insights = [
    { ad_id: "ad-1", adset_id: "as-1", campaign_id: "c-course", spend: "100", impressions: "1000", reach: "900", inline_link_clicks: "10", actions: [{ action_type: "lead", value: "7" }] },
    { ad_id: "ad-r", adset_id: "as-r", campaign_id: "c-recruit", spend: "300", impressions: "3000", reach: "2500", inline_link_clicks: "30", actions: [{ action_type: "lead", value: "40" }] },
    { ad_id: "ad-gone", adset_id: "as-1", campaign_id: "c-course", spend: "25", impressions: "250", reach: "200", inline_link_clicks: "2", actions: [{ action_type: "lead", value: "9" }] },
  ] as MetaAdInsightsRow[];

  const snapshot = mapMetaHierarchyToCampaigns(campaignNodes, adSetNodes, adNodes, insights, scope);

  assert.deepEqual(snapshot.campaigns.map((campaign) => campaign.id), ["c-course"]);
  assert.equal(snapshot.campaigns[0].adSets[0].ads.length, 1);
  assert.equal(snapshot.excludedSpend, 300);
  assert.ok(snapshot.unlisted);
  assert.equal(snapshot.unlisted.spend, 25, "only the course ad that the listing missed is unlisted");
  assert.equal(snapshot.unlisted.leads, 0, "Meta's own lead counts are never read into unlisted spend");
  assert.deepEqual(snapshot.excludedCampaigns.map((campaign) => campaign.id), ["c-recruit"], "excluded data is kept, apart from the course campaigns");
  assert.equal(snapshot.excludedCampaigns[0].adSets[0].ads[0].metrics.spend, 300);
});
