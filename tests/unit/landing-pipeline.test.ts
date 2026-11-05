import assert from "node:assert/strict";
import { test } from "node:test";

import { buildLandingPipeline, LANDING_SAMPLE_LIMIT, type LandingPipelineRow } from "@/lib/optimization/landing-pipeline";
import type { Campaign } from "@/lib/types";

// The landing-capture diagnostic on synthetic rows only. Every ID is a fixture label, except the recruitment campaign,
// which is the real excluded ID: the diagnostic must drop it the same way every report does.

const RECRUITMENT_EXCLUDED = "120248773681350125";

const listing = [
  { id: "c-sch", adSets: [{ id: "as-1", ads: [{ id: "ad-1" }] }] },
] as unknown as Campaign[];

const rows: LandingPipelineRow[] = [
  { internalLeadId: "L1", submittedAt: "2026-11-02T10:00:00.000Z", campaignId: "c-sch", adSetId: null, adId: null },
  { internalLeadId: "L2", submittedAt: "2026-11-02T11:00:00.000Z", campaignId: null, adSetId: "as-1", adId: "ad-1" },
  { internalLeadId: "L3", submittedAt: "2026-11-02T12:00:00.000Z", campaignId: null, adSetId: null, adId: null },
  { internalLeadId: "L4", submittedAt: "2026-11-02T13:00:00.000Z", campaignId: "c-unknown", adSetId: null, adId: null },
  { internalLeadId: "L5", submittedAt: "2026-11-02T14:00:00.000Z", campaignId: RECRUITMENT_EXCLUDED, adSetId: null, adId: null },
];

const range = { since: "2026-11-01", until: "2026-11-02" };

function count(report: ReturnType<typeof buildLandingPipeline>, key: string): number | null {
  const stage = report.stages.find((item) => item.key === key);
  assert.ok(stage, `stage ${key} exists`);
  return stage.count;
}

test("each landing lead is counted once, from the database to its campaign, with the excluded campaign dropped first", () => {
  const report = buildLandingPipeline({ range, dbState: "ok", rows, campaigns: listing, selectedCampaignId: "c-sch" });

  assert.equal(count(report, "db_read"), 5);
  assert.equal(count(report, "excluded_campaign"), 1, "the recruitment campaign is dropped by its ID");
  assert.equal(count(report, "in_analysis"), 4);
  assert.equal(count(report, "attributed"), 2, "a campaign-level lead and an ad-level lead are both attributed by ID");
  assert.equal(count(report, "selected_campaign"), 2, "the ad-level lead counts for its campaign too");
  assert.equal(count(report, "unassigned"), 2, "one lead with no ID and one with an ID that is not listed");
  assert.equal(report.complete, true);
});

test("the reason for every unassigned lead is stated, with the two kinds kept apart", () => {
  const report = buildLandingPipeline({ range, dbState: "ok", rows, campaigns: listing, selectedCampaignId: "c-sch" });
  const unassigned = report.stages.find((item) => item.key === "unassigned");

  assert.match(unassigned?.reason ?? "", /בלי מזהה כלל: 1 · מזהה שלא ברשימה: 1/);
});

test("the samples come with the gaps first, carry IDs and times only, and are capped", () => {
  const report = buildLandingPipeline({ range, dbState: "ok", rows, campaigns: listing, selectedCampaignId: "c-sch" });

  assert.deepEqual(
    report.samples.map((sample) => sample.internalLeadId),
    ["L3", "L4", "L1", "L2", "L5"],
    "unplaced leads first, then the selected campaign, then the excluded ones"
  );
  const allowedKeys = new Set(["internalLeadId", "submittedAt", "campaignId", "adSetId", "adId", "outcome", "outcomeText"]);
  for (const sample of report.samples) {
    for (const key of Object.keys(sample)) assert.ok(allowedKeys.has(key), `sample field ${key} is allowed`);
  }

  const many = Array.from({ length: 8 }, (_, index) => ({ ...rows[2], internalLeadId: `M${index}` }));
  const capped = buildLandingPipeline({ range, dbState: "ok", rows: many, campaigns: listing, selectedCampaignId: null });
  assert.equal(capped.samples.length, LANDING_SAMPLE_LIMIT);
});

test("a failed database read is reported as failed, never as an empty result", () => {
  const report = buildLandingPipeline({ range, dbState: "failed", rows, campaigns: listing, selectedCampaignId: "c-sch" });

  assert.equal(count(report, "db_read"), 0);
  assert.equal(report.complete, false);
  assert.match(report.completeNote, /נכשלה/);
  assert.equal(report.samples.length, 0);
});

test("a listing that did not load leaves the attribution counts unknown, not zero", () => {
  const report = buildLandingPipeline({ range, dbState: "ok", rows, campaigns: null, selectedCampaignId: "c-sch" });

  assert.equal(report.listingState, "unavailable");
  assert.equal(count(report, "attributed"), null);
  assert.equal(count(report, "unassigned"), null);
  assert.equal(count(report, "selected_campaign"), null);
  assert.equal(count(report, "excluded_campaign"), 1, "the exclusion needs no listing and is still counted");
  assert.equal(report.complete, false);
  assert.match(report.completeNote, /רשימת הקמפיינים/);
  assert.ok(report.samples.every((sample) => sample.outcome === "listing_unavailable" || sample.outcome === "excluded_campaign"));
});
