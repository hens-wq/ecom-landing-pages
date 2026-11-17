import assert from "node:assert/strict";
import { test } from "node:test";

import { evaluateOptimization } from "@/lib/optimization/engine";
import { ad, actionsFor, codesFor, engineInput, fig } from "./optimization-fixtures";

// Spec section 18, checks 1 to 5 and 7, plus the band and sample rules of sections 5 to 11.

const run = (entities: Parameters<typeof engineInput>[0], overrides: Parameters<typeof engineInput>[1] = {}) =>
  evaluateOptimization(engineInput(entities, overrides));

const PAUSE_ACTIONS = ["PAUSE_CANDIDATE", "PAUSE"];

test("check 1: frequency 4.8 with a good CPA does not produce a pause", () => {
  const output = run([
    ad("a1", {
      selected: fig({ impressions: 48_000, reach: 10_000, spend: 1600, sales: 2, leads: 20, metaLeads: 20, metaFormLeads: 20, green: 14, red: 2, pending: 4 }),
    }),
  ]);
  assert.ok(codesFor(output, "a1").includes("FRQ_HIGH"), "high-priority frequency check is shown");
  assert.ok(codesFor(output, "a1").includes("CPA_STRONG_KEEP"), "the good CPA is shown");
  assert.deepEqual(actionsFor(output, "a1").filter((action) => PAUSE_ACTIONS.includes(action)), [], "no pause");
});

test("check 2: CPL 160 with two registrations and CPA 800 gives a warning, never a pause because of CPL", () => {
  const output = run([
    ad("a1", { selected: fig({ spend: 1600, sales: 2, leads: 10, metaLeads: 10, metaFormLeads: 10, green: 7, red: 1, pending: 2 }) }),
  ]);
  const cpl = output.recommendations.find((recommendation) => recommendation.ruleCode === "CPL_SEVERE_WITH_SALES");
  assert.ok(cpl, "severe CPL with registrations is reported");
  assert.equal(cpl.action, "WARNING");
  assert.deepEqual(actionsFor(output, "a1").filter((action) => PAUSE_ACTIONS.includes(action)), [], "no pause");
});

test("check 3: fewer than five classified leads never produce a strong quality verdict", () => {
  const output = run([ad("a1", { selected: fig({ green: 2, red: 2, pending: 6, leads: 10 }) })]);
  assert.equal(codesFor(output, "a1").includes("QLT_RED_RATE"), false, "4 classified leads: no verdict at all");
});

test("check 3b: 5 to 9 classified leads can reach WATCH at most, with low confidence", () => {
  const output = run([ad("a1", { selected: fig({ green: 2, red: 5, pending: 3, leads: 10 }) })]);
  const quality = output.recommendations.find((recommendation) => recommendation.ruleCode === "QLT_RED_RATE");
  assert.ok(quality, "7 classified leads with 71% red are reported");
  assert.equal(quality.action, "WATCH", "a small sample is never a WARNING");
  assert.equal(quality.confidence, "low");
});

test("check 3c: 10 or more classified leads with a red rate above 50% is a meaningful WARNING", () => {
  const output = run([ad("a1", { selected: fig({ green: 1, red: 9, pending: 0, leads: 10 }) })]);
  const quality = output.recommendations.find((recommendation) => recommendation.ruleCode === "QLT_RED_RATE");
  assert.ok(quality);
  assert.equal(quality.action, "WARNING");
  assert.ok(quality.flags.includes("STRONG"));
  assert.equal(quality.confidence, "high");
});

test("check 4: a 30-day frequency is never judged with the weekly threshold", () => {
  const output = run(
    [ad("a1", { selected: fig({ impressions: 48_000, reach: 10_000 }) })],
    { rangeDays: 30 }
  );
  assert.equal(
    codesFor(output, "a1").some((code) => code.startsWith("FRQ_")),
    false,
    "no frequency verdict on a 30-day selection"
  );
  assert.ok(output.notes.some((note) => note.includes("Frequency מוצגת ללא שיפוט")), "the report says frequency was not judged");
});

test("check 5: zero leads with spend above 160 is a pause candidate only when both sources confirm zero", () => {
  const confirmed = run([
    ad("a1", { selected: fig({ spend: 200, impressions: 5000, reach: 2000, leads: 0, metaLeads: 0, metaFormLeads: 0, sales: 0, green: 0, red: 0, pending: 0 }) }),
  ]);
  const zero = confirmed.recommendations.find((recommendation) => recommendation.ruleCode === "LEAD_ZERO_CONFIRMED");
  assert.ok(zero, "both sources read zero");
  assert.equal(zero.action, "PAUSE_CANDIDATE");

  const metaSaysLeads = run([
    ad("a1", { selected: fig({ spend: 200, impressions: 5000, reach: 2000, leads: 0, metaLeads: 3, metaFormLeads: 0, sales: 0, green: 0, red: 0, pending: 0 }) }),
  ]);
  assert.equal(codesFor(metaSaysLeads, "a1").includes("LEAD_ZERO_CONFIRMED"), false, "Meta reports leads: no zero-leads verdict");
  assert.ok(codesFor(metaSaysLeads, "a1").includes("TRK_DASH_ZERO_META_POS"), "the mismatch is reported as a tracking issue");

  const dashboardSaysLeads = run([
    ad("a1", { selected: fig({ spend: 200, impressions: 5000, reach: 2000, leads: 2, metaLeads: 0, metaFormLeads: 2, sales: 0, green: 0, red: 0, pending: 2 }) }),
  ]);
  assert.equal(codesFor(dashboardSaysLeads, "a1").includes("LEAD_ZERO_CONFIRMED"), false, "the dashboard has leads: no zero-leads verdict");
  assert.ok(codesFor(dashboardSaysLeads, "a1").includes("TRK_META_ZERO_DASH_POS"), "Meta's zero is a tracking issue, not a verdict on the ad");

  const cheap = run([
    ad("a1", { selected: fig({ spend: 150, impressions: 5000, reach: 2000, leads: 0, metaLeads: 0, metaFormLeads: 0, sales: 0, green: 0, red: 0, pending: 0 }) }),
  ]);
  assert.equal(codesFor(cheap, "a1").includes("LEAD_ZERO_CONFIRMED"), false, "spend at or below 160 is not judged");
});

test("zero leads on a day that is not complete yet is a WARNING, never a pause", () => {
  const output = run(
    [ad("a1", { selected: fig({ spend: 200, impressions: 5000, reach: 2000, leads: 0, metaLeads: 0, metaFormLeads: 0, sales: 0, green: 0, red: 0, pending: 0 }) })],
    { selectedPartial: true }
  );
  const partial = output.recommendations.find((recommendation) => recommendation.ruleCode === "LEAD_ZERO_PARTIAL");
  assert.ok(partial);
  assert.equal(partial.action, "WARNING");
  assert.equal(codesFor(output, "a1").includes("LEAD_ZERO_CONFIRMED"), false);
});

test("check 6-7 support: a paused entity is analysed, but only tracking problems remain on it", () => {
  const output = run([
    ad("a1", {
      status: "paused",
      selected: fig({ spend: 3500, sales: 1, leads: 10, metaLeads: 10, metaFormLeads: 10, green: 7, red: 1, pending: 2 }),
    }),
  ]);
  const evaluation = output.entities.find((item) => item.id === "a1");
  assert.ok(evaluation, "the paused ad is still analysed and listed");
  assert.equal(evaluation.evaluation, "not_active");
  assert.deepEqual(actionsFor(output, "a1"), [], "no change recommendation for a paused ad");
});

test("CPL bands: 80 is on target, above 80 is a follow-up, 100 to 150 a warning, 150 and up severe", () => {
  const onTarget = run([ad("a1", { selected: fig({ spend: 800, leads: 10 }) })]);
  assert.equal(codesFor(onTarget, "a1").some((code) => code.startsWith("CPL_")), false, "80 ₪ is on target");

  const followUp = run([ad("a1", { selected: fig({ spend: 850, leads: 10 }) })]);
  assert.equal(followUp.recommendations.find((recommendation) => recommendation.ruleCode === "CPL_FOLLOW_UP")?.action, "WATCH");

  const warning = run([ad("a1", { selected: fig({ spend: 1200, leads: 10 }) })]);
  assert.equal(warning.recommendations.find((recommendation) => recommendation.ruleCode === "CPL_WARNING")?.action, "WARNING");

  const severeNoSales = run([ad("a1", { selected: fig({ spend: 1600, leads: 10, sales: 0, green: 7, red: 1, pending: 2 }) })]);
  assert.equal(severeNoSales.recommendations.find((recommendation) => recommendation.ruleCode === "CPL_SEVERE_NO_SALES")?.action, "PAUSE_CANDIDATE");

  const severeSmall = run([ad("a1", { selected: fig({ spend: 1600, leads: 9, sales: 0, green: 6, red: 1, pending: 2 }) })]);
  const small = severeSmall.recommendations.find((recommendation) => recommendation.ruleCode === "CPL_SEVERE_SMALL_SAMPLE");
  assert.equal(small?.action, "WARNING", "a small sample never reaches a pause");
});

test("CPA bands: positive below 2,000, acceptable up to 3,000, a pause candidate above it on a meaningful sample", () => {
  const small = run([ad("a1", { selected: fig({ spend: 1500, sales: 1, leads: 10 }) })]);
  assert.equal(small.recommendations.find((recommendation) => recommendation.ruleCode === "CPA_POSITIVE_SMALL")?.confidence, "low");

  const strong = run([ad("a1", { selected: fig({ spend: 3000, sales: 2, leads: 10 }) })]);
  const strongKeep = strong.recommendations.find((recommendation) => recommendation.ruleCode === "CPA_STRONG_KEEP");
  assert.equal(strongKeep?.secondaryAction, "STRONG KEEP / CHECK SCALE");
  assert.ok(strongKeep?.flags.includes("CHECK_SCALE"));

  const acceptable = run([ad("a1", { selected: fig({ spend: 2500, sales: 1, leads: 10 }) })]);
  assert.equal(acceptable.recommendations.find((recommendation) => recommendation.ruleCode === "CPA_ACCEPTABLE")?.action, "KEEP");

  const high = run([ad("a1", { selected: fig({ spend: 3500, sales: 1, leads: 10 }) })]);
  assert.equal(high.recommendations.find((recommendation) => recommendation.ruleCode === "CPA_HIGH_PAUSE_CANDIDATE")?.action, "PAUSE_CANDIDATE");
});

test("a high CPA that improved against the previous period is only a watch, not a pause candidate", () => {
  const output = run([
    ad("a1", {
      selected: fig({ spend: 3500, sales: 1, leads: 10 }),
      trendCurrent: fig({ spend: 3500, sales: 1, leads: 10 }),
      trendPrevious: fig({ spend: 4000, sales: 1, leads: 10 }),
    }),
  ]);
  assert.equal(codesFor(output, "a1").includes("CPA_HIGH_PAUSE_CANDIDATE"), false);
  assert.ok(codesFor(output, "a1").includes("CPA_HIGH_WATCH"));
});

test("zero registrations against 3,000 ₪ of spend is a watch from the CPA rule", () => {
  const output = run([ad("a1", { selected: fig({ spend: 3500, sales: 0, leads: 10, green: 7, red: 1, pending: 2 }) })]);
  assert.equal(output.recommendations.find((recommendation) => recommendation.ruleCode === "CPA_NO_REGISTRATIONS")?.action, "WATCH");
});

test("scale candidate: three registrations in seven days with stable CPA", () => {
  // CPL 75 ₪, so no severe-CPL warning blocks the scale candidate.
  const stable = fig({ spend: 1500, sales: 3, leads: 20, metaLeads: 20, metaFormLeads: 20, green: 14, red: 2, pending: 4 });
  const output = run(
    [ad("a1", { selected: stable, trendCurrent: stable, trendPrevious: stable })],
    { trendAvailable: true }
  );
  assert.equal(output.recommendations.find((recommendation) => recommendation.ruleCode === "CPA_SCALE_CANDIDATE")?.action, "SCALE_CANDIDATE");
});

test("scale is never shown without a stability check: no trend window, or CPA worsening, gives a check instead", () => {
  const figures = fig({ spend: 1500, sales: 3, leads: 20, metaLeads: 20, metaFormLeads: 20, green: 14, red: 2, pending: 4 });
  const noTrend = run([ad("a1", { selected: figures })]);
  assert.equal(codesFor(noTrend, "a1").includes("CPA_SCALE_CANDIDATE"), false);
  assert.equal(noTrend.recommendations.find((recommendation) => recommendation.ruleCode === "CPA_CHECK_SCALE")?.action, "KEEP");

  const worsening = run(
    [
      ad("a1", {
        selected: figures,
        trendCurrent: fig({ spend: 1500, sales: 3, leads: 20, metaLeads: 20, metaFormLeads: 20, green: 14, red: 2, pending: 4 }),
        // Same CPL (75 ₪ against 90 ₪ is not a rise), but CPA 300 ₪ before and 500 ₪ now: the only change is CPA.
        trendPrevious: fig({ spend: 1800, sales: 6, leads: 20, metaLeads: 20, metaFormLeads: 20, green: 14, red: 2, pending: 4 }),
      }),
    ],
    { trendAvailable: true }
  );
  assert.equal(codesFor(worsening, "a1").includes("CPA_SCALE_CANDIDATE"), false, "CPA rose more than 25%");
  assert.ok(codesFor(worsening, "a1").includes("CPA_CHECK_SCALE"));
});

test("three registrations outside a seven-day selection give a check, not a scale candidate", () => {
  const output = run([ad("a1", { selected: fig({ spend: 1500, sales: 3, leads: 10 }) })], { rangeDays: 30 });
  assert.equal(codesFor(output, "a1").includes("CPA_SCALE_CANDIDATE"), false);
  assert.ok(codesFor(output, "a1").includes("CPA_CHECK_SCALE_OUT_OF_WINDOW"));
});

test("reach drop of 50% with spend held steady is a warning; a spend change of 37% is not a delivery change", () => {
  const drop = run([
    ad("a1", {
      trendCurrent: fig({ reach: 5000, impressions: 20_000 }),
      trendPrevious: fig({ reach: 10_000, impressions: 20_000 }),
    }),
  ]);
  const reach = drop.recommendations.find((recommendation) => recommendation.ruleCode === "VOL_REACH_DROP");
  assert.equal(reach?.action, "WARNING");

  const spendMoved = run([
    ad("a1", {
      trendCurrent: fig({ reach: 5000, impressions: 20_000, spend: 1100 }),
      trendPrevious: fig({ reach: 10_000, impressions: 20_000, spend: 800 }),
    }),
  ]);
  assert.equal(codesFor(spendMoved, "a1").includes("VOL_REACH_DROP"), false);
});

test("CTR falling 66% is a strong warning whose cause is a hypothesis to check, not a fact", () => {
  const output = run([
    ad("a1", {
      trendCurrent: fig({ linkClicks: 100, impressions: 20_000 }),
      trendPrevious: fig({ linkClicks: 300, impressions: 20_000 }),
    }),
  ]);
  const ctr = output.recommendations.find((recommendation) => recommendation.ruleCode === "CRV_CTR_DROP");
  assert.ok(ctr);
  assert.equal(ctr.action, "WARNING");
  assert.ok(ctr.flags.includes("STRONG"));
  assert.match(ctr.nextCheck, /Hook/);
  assert.equal(ctr.reason.includes("השערה"), true, "the reason says it is a hypothesis");
});

test("CPM rising 25% points to delivery conditions, not creative", () => {
  const output = run([
    ad("a1", {
      trendCurrent: fig({ spend: 800, impressions: 20_000 }),
      trendPrevious: fig({ spend: 800, impressions: 25_000, linkClicks: 300 }),
    }),
  ]);
  const cpm = output.recommendations.find((recommendation) => recommendation.ruleCode === "DLV_CPM_RISE");
  assert.equal(cpm?.action, "WARNING");
  assert.equal(cpm?.flags.includes("STRONG"), false, "25% is the warning band, not the strong one");
  assert.match(cpm?.nextCheck ?? "", /placements/);
});

test("creative fatigue with good business results is KEEP with WATCH / TEST CREATIVE, never a pause", () => {
  const output = run([
    ad("a1", {
      selected: fig({ impressions: 32_000, reach: 8_000 }),
      trendCurrent: fig({ linkClicks: 100, impressions: 20_000 }),
      trendPrevious: fig({ linkClicks: 300, impressions: 20_000 }),
    }),
  ]);
  const fatigue = output.recommendations.find((recommendation) => recommendation.ruleCode === "CRV_FATIGUE");
  assert.ok(fatigue);
  assert.equal(fatigue.action, "KEEP");
  assert.equal(fatigue.secondaryAction, "WATCH / TEST CREATIVE");
  assert.deepEqual(actionsFor(output, "a1").filter((action) => PAUSE_ACTIONS.includes(action)), []);
});

test("zero impressions on an active, complete day is a delivery fix; on a partial day it is not judged", () => {
  const dead = fig({ impressions: 0, linkClicks: 0, reach: 0, spend: 0, leads: 0, metaLeads: 0, metaFormLeads: 0, sales: 0, green: 0, red: 0, pending: 0 });
  const complete = run([ad("a1", { selected: dead })]);
  assert.equal(complete.recommendations.find((recommendation) => recommendation.ruleCode === "DLV_ZERO_IMPRESSIONS")?.action, "FIX");

  const partial = run([ad("a1", { selected: dead })], { selectedPartial: true });
  assert.equal(codesFor(partial, "a1").includes("DLV_ZERO_IMPRESSIONS"), false);
});

test("a campaign whose leads are not fully loaded gets no lead verdict at all", () => {
  const output = run([
    ad("a1", { selected: fig({ leadsKnown: false, leads: 0, metaFormLeads: 0, sales: 0, green: 0, red: 0, pending: 0, spend: 1600 }) }),
  ]);
  assert.equal(codesFor(output, "a1").some((code) => /^(CPL_|CPA_|QLT_|LEAD_|TRK_)/.test(code)), false);
  assert.equal(output.entities.find((item) => item.id === "a1")?.evaluation, "insufficient_data");
});
