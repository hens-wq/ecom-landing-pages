// Course analysis excludes hiring campaigns while retaining work/career-themed course campaigns. Synthetic fixtures only.
import assert from "node:assert/strict";
import { test } from "node:test";

import { mapMetaHierarchyToCampaigns } from "@/lib/advertising/meta/mapper";
import type { MetaAdInsightsRow, MetaAdNode, MetaAdSetNode, MetaCampaignNode } from "@/lib/advertising/meta/types";
import { buildSpendReconciliation } from "@/lib/advertising/reconciliation";
import { EXCLUDED_CAMPAIGNS, excludedCampaignIdsFrom, hasVerifiedExclusions, isExcludedCampaign, isExcludedCampaignId, isRecruitmentCampaignName } from "@/lib/campaign-scope";
import { loadLeadFacts } from "@/lib/performance/load-lead-facts";
import type { LandingLeadRecord } from "@/lib/landing-leads/types";
import type { MetaFormLead } from "@/lib/leads/types";

const VERIFIED_IDS = ["120248773681350125", "120249086146440125", "120249068790360125"];
const COURSE_WORK_ID = "120249017777170125";
const COURSE_EMPLOYMENT_ID = "120248855350110125";

function formLead(id: string, campaignId: string, campaignName: string): MetaFormLead {
  return { id, createdTime: "2026-11-03T08:00:00Z", name: null, phone: null, normalizedPhone: null, email: null, formId: "form", campaignId, campaignName, adSetId: "", adSetName: "", adId: "", adName: "", sourceType: "meta_standard_form" };
}
function landingLead(id: string, campaignId: string | null, utmCampaign: string | null = null): LandingLeadRecord {
  return { internalLeadId: id, leadSource: "landing_page", metaLeadId: null, createdAt: "2026-11-03T08:00:00Z", submittedAt: "2026-11-03T08:00:00Z", name: null, phone: null, normalizedPhone: null, email: null, campaignId, adSetId: null, adId: null, landingPageUrl: null, utmSource: null, utmMedium: null, utmCampaign, utmContent: null, utmTerm: null, fbclid: null, placement: null, siteSource: null };
}

test("all three verified recruitment IDs remain excluded even after renaming", () => {
  assert.equal(hasVerifiedExclusions(), true);
  assert.deepEqual(EXCLUDED_CAMPAIGNS.map((campaign) => campaign.id), VERIFIED_IDS);
  for (const id of VERIFIED_IDS) {
    assert.equal(isExcludedCampaignId(id), true);
    assert.equal(isExcludedCampaign(id, "שם ששונה"), true);
  }
  assert.equal(isExcludedCampaignId("120248773681350126"), false);
  assert.equal(isExcludedCampaignId(""), false);
  assert.equal(isExcludedCampaignId(null), false);
});

test("explicit recruitment markers cover new campaigns, including RTL and punctuation variants", () => {
  for (const name of [
    "דרושים | אנשי מכירות | דף נחיתה", "\u200fדרושים | רכזת גיוס | טופס לידים", "קריירה במכירות - דרושות נציגות",
    "דרוש איש מכירות", "דרושה רכזת גיוס", "Sales Recruitment Campaign", "NOW HIRING | sales", "Recruiting staff", "קמפיין גיוס עובדים", "גיוס נציגי מכירות",
  ]) {
    assert.equal(isRecruitmentCampaignName(name), true, name);
    assert.equal(isExcludedCampaign("a-new-id", name), true, `new campaign: ${name}`);
  }
});

test("work, employment bureau, career and sales words alone never exclude course campaigns", () => {
  for (const name of [
    "דף הייטק לכולם | קמפיין עצמאי | נקודות כאב בעבודה", "דף הייטק לכולם | קמפיין עצמאי | לשכת התעסוקה",
    "קריירה בהייטק", "קורס מכירות", "הכלים הדרושים ללימודי הייטק", "עבודה עם שכר גבוה", "Prehiring course", "",
  ]) assert.equal(isRecruitmentCampaignName(name), false, name);
  assert.equal(isExcludedCampaign(COURSE_WORK_ID, "נקודות כאב בעבודה"), false);
  assert.equal(isExcludedCampaign(COURSE_EMPLOYMENT_ID, "לשכת התעסוקה"), false);
});

test("mapper excludes new named recruiters and reconciles their listed and unlisted spend without losing valid course spend", () => {
  const campaignNodes: MetaCampaignNode[] = [
    { id: COURSE_WORK_ID, name: "נקודות כאב בעבודה", status: "ACTIVE" },
    { id: COURSE_EMPLOYMENT_ID, name: "לשכת התעסוקה", status: "ACTIVE" },
    { id: VERIFIED_IDS[1], name: "שם ששונה", status: "ACTIVE" },
    { id: "future-recruiter", name: "דרושים | רכזת גיוס | טופס לידים", status: "ACTIVE" },
  ];
  const adSetNodes: MetaAdSetNode[] = campaignNodes.map((campaign) => ({ id: `set-${campaign.id}`, name: "סדרה", campaign_id: campaign.id, status: "ACTIVE" }));
  const adNodes: MetaAdNode[] = campaignNodes.map((campaign) => ({ id: `ad-${campaign.id}`, name: "מודעה", adset_id: `set-${campaign.id}`, campaign_id: campaign.id, status: "ACTIVE" }));
  const insights: MetaAdInsightsRow[] = [
    ...campaignNodes.map((campaign, index) => ({ ad_id: `ad-${campaign.id}`, adset_id: `set-${campaign.id}`, campaign_id: campaign.id, spend: String([100, 60, 260, 40][index]), impressions: "1000", inline_link_clicks: "10" })),
    { ad_id: "unlisted-recruit-ad", campaign_id: "future-recruiter", spend: "80", impressions: "100" },
    { ad_id: "unlisted-course-ad", campaign_id: COURSE_WORK_ID, spend: "25", impressions: "100" },
  ];
  const snapshot = mapMetaHierarchyToCampaigns(campaignNodes, adSetNodes, adNodes, insights);
  assert.deepEqual(snapshot.campaigns.map((campaign) => campaign.id), [COURSE_WORK_ID, COURSE_EMPLOYMENT_ID]);
  assert.deepEqual(snapshot.excludedCampaigns.map((campaign) => campaign.id), [VERIFIED_IDS[1], "future-recruiter"]);
  assert.equal(snapshot.excludedSpend, 380, "known-ID and newly named recruitment delivery are both excluded");
  assert.equal(snapshot.unlisted?.spend, 25, "unlisted recruitment delivery cannot leak back into course spend");
  const reconciliation = buildSpendReconciliation({ campaigns: snapshot.campaigns, unlisted: snapshot.unlisted, excludedSpend: snapshot.excludedSpend, accountSpend: { ok: true, spend: 565 } });
  assert.equal(reconciliation.status, "ok");
  assert.equal(reconciliation.summedSpend, 185);
});

test("course reach exclusion IDs include newly classified recruiters but never course employment campaigns", () => {
  const ids = excludedCampaignIdsFrom([
    { id: "future-recruiter", name: "דרושים | רכזת גיוס" },
    { id: COURSE_WORK_ID, name: "נקודות כאב בעבודה" },
    { id: COURSE_EMPLOYMENT_ID, name: "לשכת התעסוקה" },
    { id: VERIFIED_IDS[0], name: "שם חדש" },
  ]);
  assert.deepEqual(ids, [...VERIFIED_IDS, "future-recruiter"]);
});

test("Meta and landing recruitment leads are filtered before status reads, while work-related course leads remain", async () => {
  let statusIds: string[] = [];
  const result = await loadLeadFacts({ since: "2026-11-03", until: "2026-11-03" }, {
    readMetaLeads: async () => [
      formLead("meta-known", VERIFIED_IDS[2], "שם ששונה"),
      formLead("meta-future", "future-recruiter", "דרושים | רכזת גיוס"),
      formLead("meta-course", COURSE_WORK_ID, "נקודות כאב בעבודה"),
    ],
    readLandingLeads: async () => [
      landingLead("landing-known", VERIFIED_IDS[1]),
      landingLead("landing-utm-id", null, VERIFIED_IDS[2]),
      landingLead("landing-name", "future-recruiter", "דרושים | רכזת גיוס"),
      landingLead("landing-course", COURSE_EMPLOYMENT_ID, "לשכת התעסוקה"),
    ],
    readStatuses: async (ids) => { statusIds = ids; return new Map(); },
  });
  assert.deepEqual(result.leads.map((lead) => lead.id), ["meta-course", "landing-course"]);
  assert.deepEqual(statusIds, ["meta-course", "landing-course"]);
  assert.equal(result.sources.meta.state, "ok");
  assert.equal(result.sources.landing.state, "ok");
});
