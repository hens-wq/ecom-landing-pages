import assert from "node:assert/strict";
import { test } from "node:test";

import { decideCampaigns, groupDataChecks, type CampaignDecision } from "@/lib/optimization/campaign-decisions";
import type { WindowFigures } from "@/lib/optimization/derive";
import { evaluateOptimization } from "@/lib/optimization/engine";
import type { EntityInput } from "@/lib/optimization/model";
import type { AttributionGaps } from "@/lib/performance/attribution";
import { ad, engineInput, entity, fig } from "./optimization-fixtures";

// Campaign decisions on synthetic data only. Each scenario reproduces the shape of a case the user named (numbers are
// made up), and the expected decision is the one the precedence in campaign-decisions.ts gives. No campaign name or ID is
// used in the logic; the IDs below are fixture labels.

function campaign(id: string, selected: Partial<WindowFigures>, overrides: Partial<EntityInput> = {}): EntityInput {
  return entity({ level: "campaign", id, campaignId: id, campaignName: `קמפיין ${id}`, parentId: null, selected: fig(selected), ...overrides });
}

function run(entities: EntityInput[], gaps: AttributionGaps | null = null, overrides: Parameters<typeof engineInput>[1] = {}): CampaignDecision[] {
  const output = evaluateOptimization(engineInput(entities, { attributionGaps: gaps, ...overrides }));
  return decideCampaigns(output, gaps);
}

function one(decisions: CampaignDecision[], campaignId: string): CampaignDecision {
  const found = decisions.find((item) => item.campaignId === campaignId);
  assert.ok(found, `a decision exists for ${campaignId}`);
  return found;
}

/** Only meaningful rows: a healthy base the scenarios change. Leads, Meta leads and classified leads always agree. */
const JOB_PLACEMENT = { spend: 3458, impressions: 40_000, linkClicks: 900, reach: 16_000, leads: 38, metaLeads: 38, metaFormLeads: 38, sales: 2, green: 13, red: 14, pending: 11 };
const RELEASED_SOLDIERS = { spend: 1540, impressions: 30_000, linkClicks: 500, reach: 12_000, leads: 14, metaLeads: 14, metaFormLeads: 14, sales: 0, green: 1, red: 7, pending: 6 };
const NEWSPAPER = { spend: 1033, impressions: 9_000, linkClicks: 80, reach: 5_000, leads: 3, metaLeads: 3, metaFormLeads: 3, sales: 0, green: 0, red: 1, pending: 2 };
const CHEAP_BAD_QUALITY = { spend: 938, impressions: 30_000, linkClicks: 400, reach: 12_000, leads: 16, metaLeads: 16, metaFormLeads: 16, sales: 0, green: 2, red: 9, pending: 5 };
const SCHOLARSHIP = { spend: 714, impressions: 15_000, linkClicks: 200, reach: 9_000, leads: 0, metaLeads: 8, metaFormLeads: 8, sales: 0, green: 0, red: 0, pending: 0 };

test("job-placement type: 2 registrations at CPA under 2,000 ₪ is KEEP with a quality check, and never an automatic scale", () => {
  const decision = one(run([campaign("camp-1", JOB_PLACEMENT)]), "camp-1");

  assert.equal(decision.decision, "KEEP");
  assert.notEqual(decision.decision, "SCALE_CANDIDATE", "two registrations are not enough to scale");
  assert.ok(decision.warnings.some((warning) => warning.includes("אחוז אדום")), "the quality warning is shown below the decision");
  assert.match(decision.nextAction, /איכות הלידים/);
  assert.match(decision.why, /2 הרשמות/);
  assert.equal(decision.confidence, "medium");
});

test("released-soldiers type: a quality check at high priority, no scale, and the limited sample is stated", () => {
  const decision = one(run([campaign("camp-1", RELEASED_SOLDIERS)]), "camp-1");

  assert.equal(decision.decision, "INVESTIGATE");
  assert.notEqual(decision.decision, "SCALE_CANDIDATE");
  assert.equal(decision.confidence, "low", "7 red of 8 classified is a small sample, so the confidence is low");
  assert.match(decision.stillUnknown, /7 מתוך 8 מסווגים/, "the classified count is shown with the numbers");
  assert.match(decision.nextAction, /בדיקת איכות הלידים בעדיפות גבוהה: 7 מתוך 8/, "the quality check is the first action, with the count");
  assert.match(decision.nextAction, /מדגם מסווג קטן/, "the small classified sample is named");
});

test("newspaper ad: a severe price overrun is an urgent check at the ad level, not a pause on one lead", () => {
  const decisions = run([
    campaign("camp-1", NEWSPAPER),
    ad("ad-1", { campaignId: "camp-1", parentId: "adset-1", selected: fig(NEWSPAPER) }),
  ]);
  const decision = one(decisions, "camp-1");

  assert.equal(decision.decision, "INVESTIGATE");
  assert.notEqual(decision.decision, "PAUSE_CANDIDATE", "a small sample with one classified lead is not a pause");
  assert.equal(decision.focus?.level, "ad", "the check starts at the ad that carries the overrun");
  assert.equal(decision.focus?.id, "ad-1");
  assert.match(decision.nextAction, /בדיקה דחופה/);
  assert.doesNotMatch(decision.stillUnknown, /100%/, "one red lead is not a quality verdict");
  assert.match(decision.stillUnknown, /ממתין אינו ליד רע/, "pending leads are not counted as bad");
});

test("cheap leads with a quality problem: no scale on the low CPL, and the qualified CPL is shown", () => {
  const decision = one(run([campaign("camp-1", CHEAP_BAD_QUALITY)]), "camp-1");

  assert.equal(decision.decision, "INVESTIGATE");
  assert.notEqual(decision.decision, "SCALE_CANDIDATE");
  assert.notEqual(decision.decision, "PAUSE_CANDIDATE");
  assert.equal(Math.round(decision.figures.qualifiedCpl ?? 0), 469, "the qualified CPL uses green leads only");
  assert.match(decision.why, /9 מתוך 11 מסווגים אדומים/);
  assert.equal(decision.confidence, "high", "11 classified leads is a meaningful sample");
});

test("scholarship campaign: Meta reports 8 leads, the dashboard 0 — DATA CHECK with the exact gap, no stop and no scale", () => {
  const decision = one(run([campaign("camp-scholar", SCHOLARSHIP)]), "camp-scholar");

  assert.equal(decision.decision, "DATA_CHECK");
  assert.equal(decision.dataGap?.kind, "source_mismatch");
  assert.equal(decision.dataGap?.metaLeads, 8);
  assert.equal(decision.dataGap?.dashboardLeads, 0);
  assert.equal(decision.stillUnknown, "מקור הפער טרם אומת — נדרשת בדיקת קליטת לידי דף הנחיתה.");
  assert.equal(decision.focus, null);
});

test("a gap in one campaign does not hold the others: a campaign that agrees with Meta keeps its own decision", () => {
  const gaps: AttributionGaps = { unassigned: 2, noIds: 2, idNotListed: 0, landing: 2 };
  const decisions = run(
    [
      campaign("camp-scholar", SCHOLARSHIP),
      campaign("camp-good", { spend: 2000, impressions: 40_000, linkClicks: 600, reach: 16_000, leads: 10, metaLeads: 10, metaFormLeads: 10, sales: 3, green: 7, red: 1, pending: 2 }),
      campaign("camp-zero", { spend: 800, impressions: 20_000, linkClicks: 300, reach: 10_000, leads: 0, metaLeads: 0, metaFormLeads: 0, sales: 0 }),
    ],
    gaps
  );

  const scholarship = one(decisions, "camp-scholar");
  assert.equal(scholarship.decision, "DATA_CHECK");
  assert.equal(scholarship.dataGap?.kind, "attribution_missing", "the window gap is named as a possible cause, not as a fact");

  const good = one(decisions, "camp-good");
  assert.notEqual(good.decision, "DATA_CHECK", "the gap of another campaign does not block this one");
  assert.equal(good.decision, "KEEP");

  const zero = one(decisions, "camp-zero");
  assert.notEqual(zero.decision, "DATA_CHECK");
  assert.notEqual(zero.decision, "PAUSE_CANDIDATE", "zero leads are not confirmed while a lead with no ID exists");
  assert.ok(zero.warnings.some((warning) => warning.includes("לא ניתן לאשר אפס")), "the unconfirmed zero is stated");
});

test("good registrations are not overridden by CPL alone: a severe CPL with 3 registrations at a good CPA is KEEP, never a pause", () => {
  const decision = one(
    run([campaign("camp-1", { spend: 2000, impressions: 40_000, linkClicks: 600, reach: 16_000, leads: 10, metaLeads: 10, metaFormLeads: 10, sales: 3, green: 7, red: 1, pending: 2 })]),
    "camp-1"
  );

  assert.equal(decision.decision, "KEEP");
  assert.ok(decision.warnings.some((warning) => warning.includes("150")), "the severe CPL stays visible as a warning");
});

test("cheap leads with bad quality do not trigger a scale, even with registrations", () => {
  const decision = one(
    run([campaign("camp-1", { spend: 1500, impressions: 40_000, linkClicks: 600, reach: 16_000, leads: 30, metaLeads: 30, metaFormLeads: 30, sales: 3, green: 5, red: 20, pending: 5 })]),
    "camp-1"
  );

  assert.equal(decision.decision, "KEEP");
  assert.notEqual(decision.decision, "SCALE_CANDIDATE");
  assert.match(decision.nextAction, /לפני כל הגדלה/);
});

test("a scale candidate needs a stable trend: with the trend available and not worsening, it stands", () => {
  const stable = { spend: 1200, impressions: 40_000, linkClicks: 600, reach: 16_000, leads: 16, metaLeads: 16, metaFormLeads: 16, sales: 3, green: 13, red: 1, pending: 2 };
  const decision = one(
    run(
      [campaign("camp-1", stable, { trendCurrent: fig(stable), trendPrevious: fig(stable) })],
      null,
      { trendAvailable: true }
    ),
    "camp-1"
  );

  assert.equal(decision.decision, "SCALE_CANDIDATE");
  assert.equal(decision.confidence, "high");
  assert.match(decision.nextAction, /אין שינוי תקציב אוטומטי/, "the scale is a manual decision, stated as such");
});

test("a paused campaign is described as paused, never as 'pause now'; a good history gets a reactivation suggestion", () => {
  const decision = one(
    run([campaign("camp-1", { spend: 2000, impressions: 40_000, linkClicks: 600, reach: 16_000, leads: 12, metaLeads: 12, metaFormLeads: 12, sales: 2, green: 8, red: 2, pending: 2 }, { status: "paused" })]),
    "camp-1"
  );

  assert.equal(decision.status, "paused");
  assert.equal(decision.decision, "WATCH");
  assert.match(decision.nextAction, /כבר מושהה/);
  assert.match(decision.nextAction, /לשקול הפעלה מחדש/);
  assert.notEqual(decision.decision, "PAUSE_CANDIDATE");
  assert.notEqual(decision.decision, "SCALE_CANDIDATE");
});

test("no spend and no impressions in the window: INSUFFICIENT DATA with the reason", () => {
  const decision = one(
    run([campaign("camp-1", { spend: 0, impressions: 0, linkClicks: 0, reach: 0, leads: 0, metaLeads: 0, metaFormLeads: 0, sales: 0, green: 0, red: 0, pending: 0 })]),
    "camp-1"
  );

  assert.equal(decision.decision, "INSUFFICIENT_DATA");
  assert.match(decision.why, /אין הוצאה ואין חשיפה/);
});

test("a small sample gives no verdict: INSUFFICIENT DATA, with the number of leads still needed", () => {
  const decision = one(
    run([campaign("camp-1", { spend: 150, impressions: 9_000, linkClicks: 120, reach: 5_000, leads: 3, metaLeads: 3, metaFormLeads: 3, sales: 0, green: 1, red: 0, pending: 2 })]),
    "camp-1"
  );

  assert.equal(decision.decision, "INSUFFICIENT_DATA");
  assert.match(decision.recheck, /10 לידים/);
});

test("the same snapshot gives the same decisions, and the order of the entities does not change them", () => {
  const entities: EntityInput[] = [
    campaign("camp-1", JOB_PLACEMENT),
    campaign("camp-2", RELEASED_SOLDIERS),
    campaign("camp-3", SCHOLARSHIP),
    ad("ad-1", { campaignId: "camp-2", parentId: "adset-1", selected: fig(RELEASED_SOLDIERS) }),
  ];
  const output = evaluateOptimization(engineInput(entities));
  const first = decideCampaigns(output, null);

  assert.deepEqual(first, decideCampaigns(output, null), "a repeated call gives the same decisions");
  const reversed = evaluateOptimization(engineInput([...entities].reverse()));
  assert.deepEqual(decideCampaigns(reversed, null), first, "the order of the entities does not change the decisions");
});

test("every campaign gets a decision with a reason, a next action and a re-check condition", () => {
  const decisions = run([
    campaign("camp-1", JOB_PLACEMENT),
    campaign("camp-2", RELEASED_SOLDIERS),
    campaign("camp-3", SCHOLARSHIP),
    campaign("camp-4", { spend: 0, impressions: 0, linkClicks: 0, reach: 0, leads: 0, metaLeads: 0, metaFormLeads: 0, sales: 0, green: 0, red: 0, pending: 0 }),
  ]);

  assert.equal(decisions.length, 4);
  for (const decision of decisions) {
    assert.ok(decision.why.length > 0, `${decision.campaignId} has a reason`);
    assert.ok(decision.nextAction.length > 0, `${decision.campaignId} has a next action`);
    assert.ok(decision.recheck.length > 0, `${decision.campaignId} has a re-check condition`);
  }
});

test("the lead-capture gaps of several campaigns are one central task on the summary", () => {
  const gaps: AttributionGaps = { unassigned: 1, noIds: 1, idNotListed: 0, landing: 1 };
  const decisions = run(
    [
      campaign("camp-scholar", SCHOLARSHIP),
      campaign("camp-other", { spend: 900, impressions: 12_000, linkClicks: 150, reach: 7_000, leads: 2, metaLeads: 5, metaFormLeads: 5, sales: 0, green: 0, red: 0, pending: 2 }),
      campaign("camp-good", JOB_PLACEMENT),
    ],
    gaps
  );

  const tasks = groupDataChecks(decisions);
  assert.equal(tasks.length, 1, "every lead-capture gap is one task");
  assert.equal(tasks[0].taskKey, "lead-capture");
  assert.deepEqual(tasks[0].campaigns.map((item) => item.campaignId).sort(), ["camp-other", "camp-scholar"]);
});

test("the decision function reads the engine's own findings: the campaign-level action it shows matches the engine", () => {
  const entities = [campaign("camp-1", RELEASED_SOLDIERS)];
  const output = evaluateOptimization(engineInput(entities));
  const decision = one(decideCampaigns(output, null), "camp-1");
  const engineCampaignWarning = output.recommendations.find((item) => item.level === "campaign" && item.ruleCode === "CPL_WARNING");

  assert.ok(engineCampaignWarning, "the engine's CPL warning is the source");
  assert.equal(decision.decision, "INVESTIGATE");
});
