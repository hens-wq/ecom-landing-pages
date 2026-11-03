// The verified recruitment campaign is excluded by its Meta campaign ID, and only by that ID. Synthetic fixtures only.
import assert from "node:assert/strict";
import { test } from "node:test";

import { mapMetaHierarchyToCampaigns } from "@/lib/advertising/meta/mapper";
import type { MetaAdInsightsRow, MetaAdNode, MetaAdSetNode, MetaCampaignNode } from "@/lib/advertising/meta/types";
import { EXCLUDED_CAMPAIGNS, hasVerifiedExclusions, isExcludedCampaignId } from "@/lib/campaign-scope";

const RECRUITMENT_ID = "120248773681350125";
const RECRUITMENT_NAME = "דרושים | אנשי מכירות";

test("the verified recruitment campaign ID is in the exclusion list, and only that ID", () => {
  assert.equal(hasVerifiedExclusions(), true);
  assert.deepEqual(EXCLUDED_CAMPAIGNS.map((campaign) => campaign.id), [RECRUITMENT_ID]);
  assert.equal(isExcludedCampaignId(RECRUITMENT_ID), true);
  assert.equal(isExcludedCampaignId("120248773681350126"), false, "a neighbouring ID is not excluded");
  assert.equal(isExcludedCampaignId(""), false);
  assert.equal(isExcludedCampaignId(null), false);
});

test("the recruitment campaign leaves the course figures by ID; a campaign with the same name but another ID stays", () => {
  const campaignNodes = [
    { id: "900000000000000001", name: "קורס AI", status: "ACTIVE", effective_status: "ACTIVE" },
    { id: RECRUITMENT_ID, name: RECRUITMENT_NAME, status: "ACTIVE", effective_status: "ACTIVE" },
    { id: "900000000000000002", name: RECRUITMENT_NAME, status: "ACTIVE", effective_status: "ACTIVE" },
  ] as MetaCampaignNode[];
  const adSetNodes = [
    { id: "as-course", name: "סדרה", campaign_id: "900000000000000001", status: "ACTIVE", effective_status: "ACTIVE" },
    { id: "as-recruit", name: "סדרת גיוס", campaign_id: RECRUITMENT_ID, status: "ACTIVE", effective_status: "ACTIVE" },
    { id: "as-same-name", name: "סדרה נוספת", campaign_id: "900000000000000002", status: "ACTIVE", effective_status: "ACTIVE" },
  ] as MetaAdSetNode[];
  const adNodes = [
    { id: "ad-course", name: "מודעה", adset_id: "as-course", campaign_id: "900000000000000001", status: "ACTIVE", effective_status: "ACTIVE" },
    { id: "ad-recruit", name: "מודעת גיוס", adset_id: "as-recruit", campaign_id: RECRUITMENT_ID, status: "ACTIVE", effective_status: "ACTIVE" },
    { id: "ad-same-name", name: "מודעה נוספת", adset_id: "as-same-name", campaign_id: "900000000000000002", status: "ACTIVE", effective_status: "ACTIVE" },
  ] as MetaAdNode[];
  const insights = [
    { ad_id: "ad-course", adset_id: "as-course", campaign_id: "900000000000000001", spend: "100", impressions: "1000", reach: "900", inline_link_clicks: "10", actions: [] },
    { ad_id: "ad-recruit", adset_id: "as-recruit", campaign_id: RECRUITMENT_ID, spend: "260", impressions: "2600", reach: "2000", inline_link_clicks: "20", actions: [] },
    { ad_id: "ad-same-name", adset_id: "as-same-name", campaign_id: "900000000000000002", spend: "40", impressions: "400", reach: "300", inline_link_clicks: "4", actions: [] },
  ] as MetaAdInsightsRow[];

  const snapshot = mapMetaHierarchyToCampaigns(campaignNodes, adSetNodes, adNodes, insights);

  assert.deepEqual(
    snapshot.campaigns.map((campaign) => campaign.id).sort(),
    ["900000000000000001", "900000000000000002"],
    "the same-name campaign with another ID is a course campaign"
  );
  assert.deepEqual(snapshot.excludedCampaigns.map((campaign) => campaign.id), [RECRUITMENT_ID]);
  assert.equal(snapshot.excludedSpend, 260, "the recruitment spend is removed from the course figures by ID");
  assert.equal(snapshot.unlisted, null, "no recruitment delivery leaks into the unlisted spend");
});
