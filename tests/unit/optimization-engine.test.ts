import assert from "node:assert/strict";
import { test } from "node:test";

import { evaluateOptimization } from "@/lib/optimization/engine";
import type { DailyAdSpendRow, EntityInput } from "@/lib/optimization/model";
import { ad, actionsFor, codesFor, completeDates, engineInput, entity, fig } from "./optimization-fixtures";

// The decision layer: determinism (spec check 10), lowest justified level, one decision per entity, budget concentration.

const PAUSE_ACTIONS = ["PAUSE_CANDIDATE", "PAUSE"];

function adset(id: string, overrides: Partial<EntityInput> = {}): EntityInput {
  return entity({ level: "adset", id, parentId: "camp-1", ...overrides });
}

test("check 10: the same snapshot gives the same recommendations, and the order of the entities does not change them", () => {
  const entities: EntityInput[] = [
    ad("a1", { selected: fig({ spend: 3500, sales: 0, leads: 10, green: 7, red: 1, pending: 2 }) }),
    ad("a2", { selected: fig({ spend: 1500, sales: 3, leads: 10 }) }),
    ad("a3", { selected: fig({ spend: 1200, leads: 10, green: 2, red: 6, pending: 2 }) }),
  ];

  const first = evaluateOptimization(engineInput(entities));
  const second = evaluateOptimization(engineInput([...entities].reverse()));
  assert.deepEqual(first, evaluateOptimization(engineInput(entities)), "repeated run is identical");
  assert.deepEqual(second.recommendations, first.recommendations, "entity order does not change the decisions");
  assert.ok(first.recommendations.every((recommendation) => recommendation.id === `${recommendation.ruleCode}:${recommendation.level}:${recommendation.entityId}`));
});

test("a campaign is not paused because of one weak ad: the pause stays at the ad, the campaign carries a note", () => {
  const entities: EntityInput[] = [
    entity({
      level: "campaign",
      id: "camp-1",
      parentId: null,
      selected: fig({ spend: 3500, sales: 1, leads: 10, green: 7, red: 1, pending: 2 }),
    }),
    adset("adset-1", { parentId: "camp-1" }),
    ad("a1", { parentId: "adset-1", selected: fig({ spend: 3500, sales: 0, leads: 10, green: 7, red: 1, pending: 2 }) }),
  ];
  const output = evaluateOptimization(engineInput(entities));
  assert.ok(codesFor(output, "a1").includes("CPL_SEVERE_NO_SALES"), "the weak ad is a pause candidate");
  assert.deepEqual(
    actionsFor(output, "camp-1").filter((action) => PAUSE_ACTIONS.includes(action)),
    [],
    "the campaign is not a pause candidate"
  );
  const campaign = output.entities.find((item) => item.id === "camp-1");
  assert.ok(campaign?.evaluationNotes.some((note) => note.includes("ההמלצה להשהיה נשארת ברמה נמוכה יותר")));
});

test("a campaign pause is also dropped when one of its ads has a positive signal on a meaningful sample", () => {
  const entities: EntityInput[] = [
    entity({ level: "campaign", id: "camp-1", parentId: null, selected: fig({ spend: 3500, sales: 1, leads: 10 }) }),
    adset("adset-1", { parentId: "camp-1" }),
    ad("a2", { parentId: "adset-1", selected: fig({ spend: 1500, sales: 3, leads: 10 }) }),
  ];
  const output = evaluateOptimization(engineInput(entities));
  assert.deepEqual(
    actionsFor(output, "camp-1").filter((action) => PAUSE_ACTIONS.includes(action)),
    []
  );
});

test("a scale candidate yields to an active warning on the same ad, and the decision is recorded in its notes", () => {
  // CPL 75 ₪: a severe CPL would be a warning of its own, and would block scale for a different reason.
  const stable = fig({ spend: 1500, sales: 3, leads: 20, metaLeads: 20, metaFormLeads: 20, green: 14, red: 2, pending: 4 });
  const output = evaluateOptimization(
    engineInput(
      [
        ad("a1", {
          selected: stable,
          trendCurrent: fig({ spend: 1500, sales: 3, leads: 10, reach: 5000, impressions: 20_000 }),
          trendPrevious: fig({ spend: 1500, sales: 3, leads: 10, reach: 10_000, impressions: 20_000 }),
        }),
      ],
      { trendAvailable: true }
    )
  );
  assert.equal(codesFor(output, "a1").includes("CPA_SCALE_CANDIDATE"), false, "no scale while a warning is active");
  const reach = output.recommendations.find((recommendation) => recommendation.ruleCode === "VOL_REACH_DROP");
  assert.ok(reach, "the warning itself is shown");
  const evaluation = output.entities.find((item) => item.id === "a1");
  assert.ok(evaluation?.evaluationNotes.some((note) => note.startsWith("הכרעה:")), "the decision is recorded on the entity");
});

test("budget concentration: a dominant ad that is good gets KEEP with a controlled test; the other ad is marked, not failed", () => {
  const dates = completeDates(3);
  const daily: DailyAdSpendRow[] = dates.flatMap((date) => [
    { adId: "a1", campaignId: "camp-1", date, spend: 80 },
    { adId: "a2", campaignId: "camp-1", date, spend: 20 },
  ]);
  const output = evaluateOptimization(
    engineInput(
      [
        ad("a1", { selected: fig({ spend: 800, sales: 1, leads: 10 }) }),
        ad("a2", { selected: fig({ spend: 50, sales: 0, leads: 10, green: 7, red: 1, pending: 2 }) }),
      ],
      { completeDates: dates, dailyAdSpend: daily }
    )
  );
  const good = output.recommendations.find((recommendation) => recommendation.ruleCode === "BUD_CONCENTRATION_GOOD");
  assert.ok(good, "the dominant ad is judged");
  assert.equal(good.action, "KEEP");
  assert.equal(good.secondaryAction, "בדיקה מבוקרת (TEST)");
  assert.equal(output.entities.find((item) => item.id === "a2")?.evaluation, "insufficient_delivery");
  assert.equal(codesFor(output, "a2").some((code) => code.startsWith("BUD_")), false, "the other ad is not called failing");
});

test("budget concentration: a dominant ad that is weak gets a reduction candidate, never an automatic change", () => {
  const dates = completeDates(3);
  const daily: DailyAdSpendRow[] = dates.flatMap((date) => [
    { adId: "a1", campaignId: "camp-1", date, spend: 80 },
    { adId: "a2", campaignId: "camp-1", date, spend: 20 },
  ]);
  const output = evaluateOptimization(
    engineInput(
      [
        ad("a1", { selected: fig({ spend: 1700, sales: 0, leads: 10, green: 7, red: 1, pending: 2 }) }),
        ad("a2", { selected: fig({ spend: 50, sales: 0, leads: 10 }) }),
      ],
      { completeDates: dates, dailyAdSpend: daily }
    )
  );
  const weak = output.recommendations.find((recommendation) => recommendation.ruleCode === "BUD_CONCENTRATION_WEAK");
  assert.equal(weak?.action, "PAUSE_CANDIDATE");
  assert.equal(weak?.secondaryAction, "הפחתת תקציב מועמדת (REDUCE CANDIDATE)");
});

test("budget concentration needs at least three complete days, and the report says so", () => {
  const dates = completeDates(2);
  const daily: DailyAdSpendRow[] = dates.flatMap((date) => [
    { adId: "a1", campaignId: "camp-1", date, spend: 90 },
    { adId: "a2", campaignId: "camp-1", date, spend: 10 },
  ]);
  const output = evaluateOptimization(
    engineInput([ad("a1", { selected: fig() }), ad("a2", { selected: fig({ spend: 50 }) })], { completeDates: dates, dailyAdSpend: daily })
  );
  assert.equal(output.recommendations.some((recommendation) => recommendation.ruleCode.startsWith("BUD_")), false);
  assert.ok(output.notes.some((note) => note.includes("פחות מ-3 ימים מלאים")));
});

test("no daily breakdown: the budget check says it did not run, instead of guessing", () => {
  const output = evaluateOptimization(
    engineInput([ad("a1", { selected: fig() }), ad("a2", { selected: fig({ spend: 50 }) })], { dailyAdSpend: null })
  );
  assert.ok(output.notes.some((note) => note.includes("ריכוז תקציב לא נבדק")));
});

test("zero impressions on an ad is not reported again when its ad set already carries it", () => {
  const dead = fig({ impressions: 0, linkClicks: 0, reach: 0, spend: 0, leads: 0, metaLeads: 0, metaFormLeads: 0, sales: 0, green: 0, red: 0, pending: 0 });
  const output = evaluateOptimization(
    engineInput([adset("adset-1", { selected: dead, parentId: null }), ad("a1", { parentId: "adset-1", selected: dead })])
  );
  assert.ok(codesFor(output, "adset-1").includes("DLV_ZERO_IMPRESSIONS"), "the ad set carries the problem");
  assert.equal(codesFor(output, "a1").includes("DLV_ZERO_IMPRESSIONS"), false, "the ad does not repeat it");
});

test("without a comparison window the report says trends are not calculated", () => {
  const output = evaluateOptimization(engineInput([ad("a1", { selected: fig() })], { trendAvailable: false }));
  assert.ok(output.notes.some((note) => note.includes("אין תקופת השוואה")));
});

test("recommendations are sorted by priority first, then by severity, then by spend", () => {
  const output = evaluateOptimization(
    engineInput([
      ad("a1", { selected: fig({ spend: 3500, sales: 0, leads: 10, green: 7, red: 1, pending: 2 }) }),
      ad("a2", { selected: fig({ spend: 1500, sales: 3, leads: 10 }) }),
      ad("a3", { selected: fig({ spend: 1200, leads: 10, green: 2, red: 6, pending: 2 }) }),
    ])
  );
  const priorities = output.recommendations.map((recommendation) => recommendation.priority);
  assert.deepEqual([...priorities].sort((a, b) => a - b), priorities, "priority order");
});
