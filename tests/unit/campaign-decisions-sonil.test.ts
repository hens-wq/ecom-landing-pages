import assert from "node:assert/strict";
import { test } from "node:test";

import { decideCampaigns } from "@/lib/optimization/campaign-decisions";
import { evaluateOptimization } from "@/lib/optimization/engine";
import type { Level } from "@/lib/optimization/model";
import type { RunRecord } from "@/lib/optimization/run";
import { compareWithOwnRecommendations } from "@/lib/optimization/sonil/compare";
import type { NormalizedSonilRow } from "@/lib/optimization/sonil/normalize";
import { ad, engineInput, entity, fig } from "./optimization-fixtures";

// A Sonil report is a second opinion shown beside the run. It must never change the run's own decisions. Synthetic data.

function row(overrides: Partial<NormalizedSonilRow> & Pick<NormalizedSonilRow, "rowNumber" | "level" | "entityId">): NormalizedSonilRow {
  return {
    campaignId: "camp-1",
    adSetId: null,
    adId: null,
    idProblem: null,
    date: "2026-11-02",
    dateProblem: null,
    spend: 1540,
    spendProblem: null,
    leads: 14,
    leadsProblem: null,
    recommendationText: null,
    action: null,
    ...overrides,
  };
}

test("a Sonil report that disagrees with the run does not change the run's own campaign decisions", () => {
  const selected = { spend: 1540, leads: 14, metaLeads: 14, metaFormLeads: 14, sales: 0, green: 1, red: 7, pending: 6 };
  const entities = [
    entity({ level: "campaign", id: "camp-1", campaignId: "camp-1", parentId: null, selected: fig(selected) }),
    ad("ad-1", { campaignId: "camp-1", parentId: "adset-1", selected: fig(selected) }),
  ];
  const output = evaluateOptimization(engineInput(entities));
  const record = { runId: "test-run", output, metricsSnapshot: { entities } } as unknown as RunRecord;
  const before = decideCampaigns(output, null);

  // Sonil says "scale" for the ad, while the run says the campaign needs an investigation. Neither row may move the run.
  const rows: NormalizedSonilRow[] = [
    row({ rowNumber: 2, level: "campaign" as Level, entityId: "camp-1", recommendationText: "להגדיל", action: "SCALE_CANDIDATE" }),
    row({ rowNumber: 3, level: "ad" as Level, entityId: "ad-1", adId: "ad-1", recommendationText: "להגדיל", action: "SCALE_CANDIDATE" }),
    row({ rowNumber: 4, level: null, entityId: null, campaignId: null, idProblem: "לא נמצא מזהה", spend: null, leads: null, action: null }),
  ];

  const comparison = compareWithOwnRecommendations(record, rows);
  assert.ok(comparison.length > 0, "the comparison has rows to show");
  assert.deepEqual(decideCampaigns(record.output, null), before, "the run's decisions are unchanged by the Sonil report");
  assert.equal(before[0].decision, "INVESTIGATE", "the run's own decision is still the one the rules gave");
});
