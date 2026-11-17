// The lead-data state of a unit: a zero is shown with its reason, never as an unexplained zero. Synthetic figures only.
import assert from "node:assert/strict";
import { test } from "node:test";

import { LEAD_DATA_STATE_LABELS, leadDataStateOf, type LeadDataFigures } from "@/lib/optimization/lead-data-state";
import type { AttributionGaps } from "@/lib/performance/attribution";

const NO_GAPS: AttributionGaps = { unassigned: 0, noIds: 0, idNotListed: 0, landing: 0 };
const base: LeadDataFigures = { leadsKnown: true, spend: 800, impressions: 20_000, leads: 0, metaLeads: 0 };

test("both sources show zero, and every lead of the window carries an ID: confirmed zero", () => {
  assert.equal(leadDataStateOf(base, NO_GAPS), "confirmed_zero");
});

test("both sources show zero while a lead has no ID: attribution missing, not a zero", () => {
  assert.equal(leadDataStateOf(base, { ...NO_GAPS, unassigned: 1, noIds: 1, landing: 1 }), "attribution_missing");
});

test("Meta counts more leads than the unit has, and a lead of the window is unattributed: attribution missing", () => {
  assert.equal(leadDataStateOf({ ...base, metaLeads: 6, leads: 2 }, { ...NO_GAPS, unassigned: 4, idNotListed: 4 }), "attribution_missing");
});

test("Meta counts leads the dashboard lacks and nothing is unattributed: source mismatch", () => {
  assert.equal(leadDataStateOf({ ...base, metaLeads: 6 }, NO_GAPS), "source_mismatch");
});

test("the dashboard has leads that Meta does not count: source mismatch", () => {
  assert.equal(leadDataStateOf({ ...base, leads: 4, metaLeads: 0 }, NO_GAPS), "source_mismatch");
});

test("both sources agree on a count above zero: ok", () => {
  assert.equal(leadDataStateOf({ ...base, leads: 3, metaLeads: 3 }, NO_GAPS), "ok");
});

test("lead data that did not load in full is data unavailable, whatever the spend", () => {
  assert.equal(leadDataStateOf({ ...base, leadsKnown: false }, NO_GAPS), "data_unavailable");
});

test("nothing spent and nothing shown in the window: no delivery, so there is nothing to count", () => {
  assert.equal(leadDataStateOf({ ...base, spend: 0, impressions: 0 }, NO_GAPS), "no_delivery");
});

test("every state has an English name, a Hebrew name and a tone", () => {
  for (const label of Object.values(LEAD_DATA_STATE_LABELS)) {
    assert.ok(label.en.length > 0 && label.he.length > 0 && label.tone.length > 0);
  }
  assert.equal(LEAD_DATA_STATE_LABELS.attribution_missing.en, "Attribution Missing");
  assert.equal(LEAD_DATA_STATE_LABELS.attribution_missing.he, "שיוך חסר");
});
