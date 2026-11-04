import assert from "node:assert/strict";
import { test } from "node:test";

import { mapMetaHierarchyToCampaigns } from "@/lib/advertising/meta/mapper";
import type { MetaAdInsightsRow, MetaAdNode, MetaAdSetNode, MetaCampaignNode } from "@/lib/advertising/meta/types";
import { buildPerformanceTree } from "@/lib/aggregate";
import { attributeLeadFacts } from "@/lib/performance/attribution";
import { loadLeadFacts, type LeadFactsSources } from "@/lib/performance/load-lead-facts";
import { defaultLeadStatusRecord, type MainStatus } from "@/lib/lead-status/types";
import type { MetaFormLead } from "@/lib/leads/types";
import { evaluateOptimization } from "@/lib/optimization/engine";
import { buildWindowEntities, combineWindowEntities } from "@/lib/optimization/snapshot";
import { engineInput } from "./optimization-fixtures";

// Synthetic Meta hierarchy and leads, run through the same mapper, loader and attribution the app uses.
// Covers: the recruitment campaign is excluded by ID, a paused campaign with spend is analysed, the figures agree with
// the dashboard's own tree, and parent reach is never a sum when Meta supplies it.

const RECRUITMENT_ID = "120248773681350125";

const campaignNodes: MetaCampaignNode[] = [
  { id: "c-course", name: "קמפיין קורס", status: "ACTIVE" },
  { id: RECRUITMENT_ID, name: "דרושים | אנשי מכירות", status: "ACTIVE" },
  { id: "c-paused", name: "קמפיין קורס כבוי", status: "PAUSED" },
];
const adSetNodes: MetaAdSetNode[] = [
  { id: "as-course", name: "סדרה", campaign_id: "c-course", status: "ACTIVE" },
  { id: "as-recruit", name: "סדרה גיוס", campaign_id: RECRUITMENT_ID, status: "ACTIVE" },
  { id: "as-paused", name: "סדרה כבויה", campaign_id: "c-paused", status: "PAUSED" },
];
const adNodes: MetaAdNode[] = [
  { id: "ad-course", name: "מודעה קורס", adset_id: "as-course", campaign_id: "c-course", status: "ACTIVE" },
  { id: "ad-recruit", name: "מודעה גיוס", adset_id: "as-recruit", campaign_id: RECRUITMENT_ID, status: "ACTIVE" },
  { id: "ad-paused", name: "מודעה כבויה", adset_id: "as-paused", campaign_id: "c-paused", status: "PAUSED" },
];
const insightRows: MetaAdInsightsRow[] = [
  { ad_id: "ad-course", adset_id: "as-course", campaign_id: "c-course", spend: "800", impressions: "20000", reach: "8000", inline_link_clicks: "300", actions: [] },
  { ad_id: "ad-recruit", adset_id: "as-recruit", campaign_id: RECRUITMENT_ID, spend: "900", impressions: "5000", reach: "3000", inline_link_clicks: "50", actions: [] },
  { ad_id: "ad-paused", adset_id: "as-paused", campaign_id: "c-paused", spend: "500", impressions: "12000", reach: "6000", inline_link_clicks: "120", actions: [] },
];

function formLead(id: string, adId: string, adSetId: string, campaignId: string): MetaFormLead {
  return {
    id,
    createdTime: "2026-11-02T08:00:00.000Z",
    name: null,
    phone: null,
    normalizedPhone: null,
    email: null,
    formId: "form-test",
    campaignId,
    campaignName: "קמפיין בדיקה",
    adSetId,
    adSetName: "סדרה בדיקה",
    adId,
    adName: "מודעה בדיקה",
    sourceType: "meta_standard_form",
  };
}

const LEADS: MetaFormLead[] = [
  formLead("lead-course", "ad-course", "as-course", "c-course"),
  formLead("lead-paused", "ad-paused", "as-paused", "c-paused"),
  formLead("lead-recruit", "ad-recruit", "as-recruit", RECRUITMENT_ID),
];
const STATUSES: Record<string, { main: MainStatus; secondary: string; full: number | null }> = {
  "lead-course": { main: "נרשם", secondary: "תשלום מלא", full: 1000 },
  "lead-paused": { main: "חדש", secondary: "חדש", full: null },
};

const sources: LeadFactsSources = {
  readMetaLeads: async () => LEADS,
  readLandingLeads: async () => [],
  readStatuses: async (ids) =>
    new Map(
      ids.flatMap((id) => {
        const status = STATUSES[id];
        if (!status) return [];
        return [[id, { ...defaultLeadStatusRecord(id, null), mainStatus: status.main, secondaryStatus: status.secondary, fullPaymentAmount: status.full }] as const];
      })
    ),
};

async function buildFixture() {
  const snapshot = mapMetaHierarchyToCampaigns(campaignNodes, adSetNodes, adNodes, insightRows);
  const leads = await loadLeadFacts({ since: "2026-11-02", until: "2026-11-02" }, sources);
  return { snapshot, leads };
}

test("the recruitment campaign is left out of every entity and every lead, by its ID", async () => {
  const { snapshot, leads } = await buildFixture();
  const entities = buildWindowEntities({ campaigns: snapshot.campaigns, leadFacts: leads.leads, levelReach: null });
  assert.equal(entities.has(`campaign:${RECRUITMENT_ID}`), false);
  assert.equal(entities.has("ad:ad-recruit"), false);
  assert.equal(leads.leads.some((lead) => lead.id === "lead-recruit"), false, "its leads are not loaded into any figure");
  assert.equal(snapshot.excludedSpend, 900, "its spend is kept aside, not counted");
  assert.equal(snapshot.excludedCampaigns.length, 1, "the data stays in the system");
});

test("a paused campaign with spend in the window is analysed, and it is never a change recommendation", async () => {
  const { snapshot, leads } = await buildFixture();
  const entities = buildWindowEntities({ campaigns: snapshot.campaigns, leadFacts: leads.leads, levelReach: null });
  const paused = entities.get("campaign:c-paused");
  assert.ok(paused, "the paused campaign is listed");
  assert.equal(paused.status, "paused");
  assert.equal(paused.figures.spend, 500);

  const output = evaluateOptimization(engineInput(combineWindowEntities({ selected: entities, current: null, previous: null })));
  assert.equal(output.entities.find((item) => item.key === "campaign:c-paused")?.evaluation, "not_active");
  assert.equal(
    output.recommendations.some((recommendation) => recommendation.entityId === "c-paused" && recommendation.action === "PAUSE_CANDIDATE"),
    false
  );
});

test("the optimization figures agree with the dashboard tree: lead counts and quality counts add up for every entity", async () => {
  const { snapshot, leads } = await buildFixture();
  const entities = buildWindowEntities({ campaigns: snapshot.campaigns, leadFacts: leads.leads, levelReach: null });
  const tree = buildPerformanceTree(snapshot.campaigns, attributeLeadFacts(snapshot.campaigns, leads.leads));
  const campaignRow = tree.find((row) => row.id === "c-course");
  const campaignEntity = entities.get("campaign:c-course");
  assert.ok(campaignRow && campaignEntity);
  assert.equal(campaignEntity.figures.leads, campaignRow.metrics.leads, "same attribution as the dashboard");
  assert.equal(campaignEntity.figures.sales, campaignRow.metrics.sales);
  assert.equal(campaignEntity.figures.revenue, campaignRow.metrics.revenue);

  for (const entityItem of entities.values()) {
    const quality = entityItem.figures.green + entityItem.figures.red + entityItem.figures.pending + entityItem.figures.unmapped;
    assert.equal(quality, entityItem.figures.leads, `${entityItem.key}: every lead has exactly one quality class`);
  }
});

test("parent reach comes from Meta's own level reach when it is supplied, and is never a sum of ad reach", async () => {
  const { snapshot, leads } = await buildFixture();
  const entities = buildWindowEntities({
    campaigns: snapshot.campaigns,
    leadFacts: leads.leads,
    levelReach: { campaign: { "c-course": 6_500 }, adset: { "as-course": 6_500 } },
  });
  assert.equal(entities.get("campaign:c-course")?.figures.reach, 6_500, "unique reach as Meta reports it");
  assert.equal(entities.get("ad:ad-course")?.figures.reach, 8_000, "an ad's own reach is exact");
});

test("when Meta's level reach is unavailable, parent reach is unknown and no parent frequency is judged", async () => {
  const { snapshot, leads } = await buildFixture();
  const entities = buildWindowEntities({ campaigns: snapshot.campaigns, leadFacts: leads.leads, levelReach: null });
  assert.equal(entities.get("campaign:c-course")?.figures.reachKnown, false);
  assert.equal(entities.get("ad:ad-course")?.figures.reachKnown, true);
});

test("when lead data did not load in full, every lead figure is unknown rather than zero", async () => {
  const { snapshot } = await buildFixture();
  const entities = buildWindowEntities({ campaigns: snapshot.campaigns, leadFacts: null, levelReach: null });
  const course = entities.get("campaign:c-course");
  assert.equal(course?.figures.leadsKnown, false);
  const output = evaluateOptimization(engineInput(combineWindowEntities({ selected: entities, current: null, previous: null })));
  assert.equal(output.entities.find((item) => item.key === "campaign:c-course")?.evaluation, "insufficient_data");
});
