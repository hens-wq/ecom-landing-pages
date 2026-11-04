// Reach is never a sum. A campaign's or ad set's reach is the unique reach Meta reports at that level, and its frequency is
// its own impressions over that reach. Synthetic fixtures only.
import assert from "node:assert/strict";
import { test } from "node:test";

import { aggregateTotals, buildPerformanceTree } from "@/lib/aggregate";
import { mapMetaHierarchyToCampaigns } from "@/lib/advertising/meta/mapper";
import { courseReachFromRows, courseReachParams, levelReachParams, reachById, reachFromRow } from "@/lib/advertising/meta/reach-params";
import { MockAdvertisingProvider } from "@/lib/advertising/mock-provider";
import { sumRawMetrics } from "@/lib/calculations";
import { EXCLUDED_CAMPAIGNS } from "@/lib/campaign-scope";
import type { Campaign, RawMetrics } from "@/lib/types";

const RANGE = { since: "2026-10-27", until: "2026-11-02" };

function raw(spend: number, impressions: number, reach: number): RawMetrics {
  return { spend, impressions, reach, linkClicks: 0, leads: 0, sales: 0, revenue: 0 };
}

// Campaign C: ad A1 and A2 share ad set S1; ad A3 is in S2. Ad reach sums to 2,700, but the campaign's own unique reach is
// 2,000, because some people saw more than one ad.
const campaigns: Campaign[] = [
  {
    id: "C",
    name: "קמפיין סינתטי",
    objective: "Meta Ads",
    status: "active",
    adSets: [
      {
        id: "S1",
        name: "סט 1",
        campaignId: "C",
        status: "active",
        ads: [
          { id: "A1", name: "מודעה 1", adSetId: "S1", status: "active", destinationType: "unknown", metrics: raw(100, 1000, 800) },
          { id: "A2", name: "מודעה 2", adSetId: "S1", status: "active", destinationType: "unknown", metrics: raw(50, 1000, 400) },
        ],
      },
      {
        id: "S2",
        name: "סט 2",
        campaignId: "C",
        status: "active",
        ads: [{ id: "A3", name: "מודעה 3", adSetId: "S2", status: "active", destinationType: "unknown", metrics: raw(200, 2000, 1500) }],
      },
    ],
  },
];

const levelReach = { campaign: { C: 2000 }, adset: { S1: 1300, S2: 1500 } };

test("a campaign's reach is Meta's level reach, never the sum of its ads' reach", () => {
  const [campaign] = buildPerformanceTree(campaigns, undefined, null, levelReach);
  assert.equal(campaign.metrics.reach, 2000);
  assert.notEqual(campaign.metrics.reach, 2700, "the sum of the ads' reach is not used");
  assert.equal(campaign.adSets[0].metrics.reach, 1300, "an ad set takes its own level reach");
  assert.equal(campaign.adSets[0].ads[0].metrics.reach, 800, "an ad keeps its own reach");
});

test("frequency is the parent's impressions over its own reach, not an average of its children's frequencies", () => {
  const [campaign] = buildPerformanceTree(campaigns, undefined, null, levelReach);
  // 4,000 impressions over 2,000 people.
  assert.equal(campaign.metrics.frequency, 2);
  // The average of the three ads' own frequencies is about 1.69, which is a different and wrong number.
  const averageOfAds = (1000 / 800 + 1000 / 400 + 2000 / 1500) / 3;
  assert.ok(Math.abs(campaign.metrics.frequency! - averageOfAds) > 0.2, "the average of children is never used");
  assert.equal(campaign.adSets[0].metrics.frequency, 2000 / 1300);
});

test("without the level reach, parents have unknown reach and frequency, and the ads keep their own reach", () => {
  const [campaign] = buildPerformanceTree(campaigns);
  assert.equal(campaign.metrics.reach, null);
  assert.equal(campaign.metrics.frequency, null);
  assert.equal(campaign.adSets[0].metrics.reach, null);
  assert.equal(campaign.adSets[0].ads[0].metrics.reach, 800);
});

test("a parent missing from the level reach is unknown when it had impressions, and zero only when it had none", () => {
  const [withImpressions] = buildPerformanceTree(campaigns, undefined, null, { campaign: {}, adset: {} });
  assert.equal(withImpressions.metrics.reach, null, "impressions but no entry from Meta: unknown, not zero");

  const idle: Campaign[] = [
    {
      id: "E",
      name: "קמפיין ללא הוצאה",
      objective: "Meta Ads",
      status: "paused",
      adSets: [
        {
          id: "SE",
          name: "סט ריק",
          campaignId: "E",
          status: "paused",
          ads: [{ id: "AE", name: "מודעה ריקה", adSetId: "SE", status: "paused", destinationType: "unknown", metrics: raw(0, 0, 0) }],
        },
      ],
    },
  ];
  const [noDelivery] = buildPerformanceTree(idle, undefined, null, { campaign: {}, adset: {} });
  assert.equal(noDelivery.metrics.reach, 0, "no impressions and no entry: nothing was reached");
});

test("totals take the reach they are given, and reach is never summed across rows", () => {
  const rows = buildPerformanceTree(campaigns, undefined, null, levelReach);
  assert.equal(aggregateTotals(rows, 2100).reach, 2100, "the course reach comes from Meta at account level");
  assert.equal(aggregateTotals(rows, null).reach, null, "unknown stays unknown");
  assert.equal(aggregateTotals(rows, null).frequency, null);
  assert.equal(aggregateTotals(rows, 2100).impressions, 4000, "additive figures are still summed");
  assert.equal(sumRawMetrics([raw(1, 10, 5), raw(2, 20, 7)]).reach, null, "sumRawMetrics never produces a reach");
});

test("delivery the listing did not return has no reach of its own, so its reach is unknown", () => {
  const snapshot = mapMetaHierarchyToCampaigns(
    [],
    [],
    [],
    [{ ad_id: "gone", adset_id: "gone-set", campaign_id: "gone-campaign", spend: "25", impressions: "250", reach: "200", inline_link_clicks: "2", actions: [] }]
  );
  assert.ok(snapshot.unlisted);
  assert.equal(snapshot.unlisted.spend, 25);
  assert.equal(snapshot.unlisted.reach, null);
});

test("the Meta reach reads ask for the same range at each level, and the course read filters out the excluded campaign by ID", () => {
  const campaign = levelReachParams("campaign", RANGE);
  assert.equal(campaign.level, "campaign");
  assert.equal(campaign.fields, "campaign_id,reach");
  assert.deepEqual(JSON.parse(campaign.time_range), RANGE);

  const adSet = levelReachParams("adset", RANGE);
  assert.equal(adSet.level, "adset");
  assert.equal(adSet.fields, "adset_id,reach");
  assert.deepEqual(JSON.parse(adSet.time_range), RANGE);

  const course = courseReachParams(RANGE, EXCLUDED_CAMPAIGNS.map((item) => item.id));
  assert.equal(course.level, "account");
  assert.equal(course.fields, "reach");
  assert.deepEqual(JSON.parse(course.time_range), RANGE);
  assert.deepEqual(JSON.parse(course.filtering), [{ field: "campaign.id", operator: "NOT_IN", value: ["120248773681350125"] }]);

  assert.equal(courseReachParams(RANGE, []).filtering, undefined, "with nothing excluded, nothing is filtered");
});

test("a Meta reach value that is missing or unreadable is a failed read, never zero", () => {
  assert.equal(reachFromRow({ reach: "1234" }), 1234);
  assert.throws(() => reachFromRow({}), /תפוצה/);
  assert.throws(() => reachFromRow({ reach: "abc" }), /תפוצה/);
  assert.throws(() => courseReachFromRows([{ reach: "1" }, { reach: "2" }]), /תפוצה/, "two account rows are not one total");
  assert.equal(courseReachFromRows([]), 0, "no account row: nothing was delivered");
  assert.deepEqual(reachById([{ campaign_id: "C", reach: "2000" }], (row) => row.campaign_id), { C: 2000 });
});

test("demo reach is synthetic and bounded: a parent reaches at least as many people as its largest child, and at most its impressions", async () => {
  const provider = new MockAdvertisingProvider();
  const { campaigns: demoCampaigns } = await provider.getCampaigns(RANGE);
  const levels = await provider.getLevelReach(RANGE);
  let largestCampaignReach = 0;
  let courseImpressions = 0;
  let someParentDiffersFromItsChildren = false;

  for (const campaign of demoCampaigns) {
    let campaignImpressions = 0;
    let largestAdSetReach = 0;
    for (const adSet of campaign.adSets) {
      let adSetImpressions = 0;
      let largestAdReach = 0;
      let adSetReachSum = 0;
      for (const ad of adSet.ads) {
        adSetImpressions += ad.metrics.impressions;
        largestAdReach = Math.max(largestAdReach, ad.metrics.reach ?? 0);
        adSetReachSum += ad.metrics.reach ?? 0;
      }
      const adSetReach = levels.adset[adSet.id];
      assert.ok(adSetReach >= largestAdReach && adSetReach <= adSetImpressions, `ad set ${adSet.id} is within its bounds`);
      if (adSet.ads.length > 1 && adSetReach !== adSetReachSum) someParentDiffersFromItsChildren = true;
      campaignImpressions += adSetImpressions;
      largestAdSetReach = Math.max(largestAdSetReach, adSetReach);
    }
    const campaignReach = levels.campaign[campaign.id];
    assert.ok(campaignReach >= largestAdSetReach && campaignReach <= campaignImpressions, `campaign ${campaign.id} is within its bounds`);
    largestCampaignReach = Math.max(largestCampaignReach, campaignReach);
    courseImpressions += campaignImpressions;
  }

  const courseReach = await provider.getCourseReach(RANGE);
  assert.ok(courseReach >= largestCampaignReach && courseReach <= courseImpressions, "the course total is within its bounds");
  assert.ok(someParentDiffersFromItsChildren, "demo parents are their own figures, not the sum of their ads' reach");
});
