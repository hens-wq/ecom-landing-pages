// Attribution of lead facts to listed units, and what the rules say about the leads that carry no unit. Synthetic IDs only.
import assert from "node:assert/strict";
import { test } from "node:test";

import { evaluateOptimization } from "@/lib/optimization/engine";
import { attributeLeadFacts, type AttributionGaps } from "@/lib/performance/attribution";
import type { LeadFact } from "@/lib/performance/types";
import type { Campaign, RawMetrics } from "@/lib/types";
import { ad, codesFor, engineInput, fig } from "./optimization-fixtures";

const RAW: RawMetrics = { spend: 100, impressions: 1000, reach: 500, linkClicks: 10, leads: 0, sales: 0, revenue: 0 };

/** One listed campaign (C1) with one ad set (S1) and one ad (A1). The IDs are made up. */
const LISTED: Campaign[] = [
  {
    id: "C1",
    name: "קמפיין סינתטי",
    objective: "Leads",
    status: "active",
    adSets: [
      {
        id: "S1",
        name: "סט סינתטי",
        campaignId: "C1",
        status: "active",
        ads: [{ id: "A1", name: "מודעה סינתטית", adSetId: "S1", status: "active", destinationType: "unknown", metrics: RAW }],
      },
    ],
  },
];

function landingLead(id: string, ids: { campaignId?: string; adSetId?: string; adId?: string } = {}): LeadFact {
  return {
    id,
    sourceType: "landing_page",
    leadDate: "2026-11-02",
    campaignId: ids.campaignId ?? null,
    adSetId: ids.adSetId ?? null,
    adId: ids.adId ?? null,
    statusKnown: false,
    mainStatus: null,
    secondaryStatus: null,
    fullPaymentAmount: null,
    partialPaymentAmount: null,
  };
}

test("a lead that carries a listed ID is attributed to that unit, and no gap is counted", () => {
  const attribution = attributeLeadFacts(LISTED, [landingLead("l1", { campaignId: "C1" }), landingLead("l2", { adId: "A1" })]);
  assert.equal(attribution.byCampaign.get("C1")?.leads, 1);
  assert.equal(attribution.byAd.get("A1")?.leads, 1);
  assert.deepEqual(attribution.gaps, { unassigned: 0, noIds: 0, idNotListed: 0, landing: 0 });
});

test("a lead with a listed campaign but an unlisted ad is attributed to the campaign, not counted as a gap", () => {
  const attribution = attributeLeadFacts(LISTED, [landingLead("l3", { campaignId: "C1", adId: "A999" })]);
  assert.equal(attribution.byCampaign.get("C1")?.leads, 1);
  assert.equal(attribution.gaps.unassigned, 0);
});

test("a lead with no ID is a gap of its own kind, and a lead with an unlisted ID is a gap of another kind", () => {
  const attribution = attributeLeadFacts(LISTED, [landingLead("l4"), landingLead("l5", { campaignId: "999000111" })]);
  assert.deepEqual(attribution.gaps, { unassigned: 2, noIds: 1, idNotListed: 1, landing: 2 });
  assert.equal(attribution.unassigned.leads, 2, "both leads are still counted in the account, just not in a unit");
});

const noLeads = fig({ leads: 0, metaLeads: 0, metaFormLeads: 0, green: 0, red: 0, pending: 0, unmapped: 0, sales: 0, revenue: 0 });
const GAPS_NONE: AttributionGaps = { unassigned: 0, noIds: 0, idNotListed: 0, landing: 0 };
const GAPS_NO_IDS: AttributionGaps = { unassigned: 3, noIds: 3, idNotListed: 0, landing: 3 };

test("Meta reports leads that the dashboard cannot attribute: attribution is missing, and the unit is not called broken", () => {
  const output = evaluateOptimization(
    engineInput([ad("a1", { selected: fig({ leads: 0, metaLeads: 10, metaFormLeads: 0, green: 0, red: 0, pending: 0, sales: 0, revenue: 0 }) })], {
      attributionGaps: GAPS_NO_IDS,
    })
  );
  const codes = codesFor(output, "a1");
  assert.ok(codes.includes("TRK_ATTRIBUTION_MISSING"), "the gap is named");
  assert.ok(!codes.includes("TRK_DASH_ZERO_META_POS"), "the gap explains the difference, so it is not a source mismatch");
  const finding = output.recommendations.find((recommendation) => recommendation.ruleCode === "TRK_ATTRIBUTION_MISSING");
  assert.equal(finding?.action, "CHECK_DATA", "the action is a data check, never FIX tracking");
  assert.ok(finding?.nextCheck.includes("campaign_id"), "the check says which IDs are missing");
});

test("without any lead missing an ID, Meta's count against an empty dashboard is a source mismatch to check", () => {
  const output = evaluateOptimization(
    engineInput([ad("a1", { selected: fig({ leads: 0, metaLeads: 10, metaFormLeads: 0, green: 0, red: 0, pending: 0, sales: 0, revenue: 0 }) })], {
      attributionGaps: GAPS_NONE,
    })
  );
  assert.ok(codesFor(output, "a1").includes("TRK_DASH_ZERO_META_POS"));
  const finding = output.recommendations.find((recommendation) => recommendation.ruleCode === "TRK_DASH_ZERO_META_POS");
  assert.equal(finding?.action, "CHECK_DATA");
});

test("attributed landing-page leads are the unit's dashboard leads: they raise no tracking verdict", () => {
  const output = evaluateOptimization(
    engineInput([ad("a1", { selected: fig({ leads: 5, metaLeads: 0, metaFormLeads: 0, green: 3, red: 1, pending: 1, unmapped: 0, sales: 0, revenue: 0 }) })], {
      attributionGaps: GAPS_NONE,
    })
  );
  assert.equal(codesFor(output, "a1").some((code) => code.startsWith("TRK_")), false);
});

test("a zero is confirmed only when every lead of the window carries an ID", () => {
  const confirmed = evaluateOptimization(engineInput([ad("a1", { selected: noLeads })], { attributionGaps: GAPS_NONE }));
  assert.ok(codesFor(confirmed, "a1").includes("LEAD_ZERO_CONFIRMED"), "no lead is unidentified: the zero stands");

  const withoutIds = evaluateOptimization(engineInput([ad("a1", { selected: noLeads })], { attributionGaps: GAPS_NO_IDS }));
  assert.equal(codesFor(withoutIds, "a1").includes("LEAD_ZERO_CONFIRMED"), false, "a lead with no ID could belong to this unit");
});
