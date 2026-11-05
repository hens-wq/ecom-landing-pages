// The scope of a window's unplaced leads: one unit's gap never holds another unit that agrees with Meta. Synthetic figures.
import assert from "node:assert/strict";
import { test } from "node:test";

import { gapAffects, leadDataStateOf, type LeadDataFigures } from "@/lib/optimization/lead-data-state";
import type { AttributionGaps } from "@/lib/performance/attribution";

const NO_GAPS: AttributionGaps = { unassigned: 0, noIds: 0, idNotListed: 0, landing: 0 };
const base: LeadDataFigures = { leadsKnown: true, spend: 800, impressions: 20_000, leads: 0, metaLeads: 0 };

test("a unit whose count agrees with Meta is not held by another unit's gap: ok", () => {
  assert.equal(leadDataStateOf({ ...base, leads: 10, metaLeads: 10 }, { ...NO_GAPS, unassigned: 3, noIds: 3 }), "ok");
});

test("a unit at zero is confirmed when the window's gap has only leads with an unlisted ID, since those cannot belong to it", () => {
  assert.equal(leadDataStateOf(base, { ...NO_GAPS, unassigned: 2, idNotListed: 2 }), "confirmed_zero");
});

test("a shortfall is explained only by an unplaced lead of the window", () => {
  assert.equal(gapAffects({ leads: 2, metaLeads: 6 }, { ...NO_GAPS, unassigned: 4, idNotListed: 4 }), true);
  assert.equal(gapAffects({ leads: 2, metaLeads: 6 }, NO_GAPS), false);
});

test("a zero is held only by a lead with no ID at all, and a unit above Meta is never held by a gap", () => {
  assert.equal(gapAffects({ leads: 0, metaLeads: 0 }, { ...NO_GAPS, unassigned: 1, noIds: 1 }), true);
  assert.equal(gapAffects({ leads: 0, metaLeads: 0 }, { ...NO_GAPS, unassigned: 2, idNotListed: 2 }), false);
  assert.equal(gapAffects({ leads: 4, metaLeads: 0 }, { ...NO_GAPS, unassigned: 3, noIds: 3 }), false);
});

test("without the listing of a window there is no gap to hold anything", () => {
  assert.equal(gapAffects({ leads: 0, metaLeads: 5 }, null), false);
  assert.equal(leadDataStateOf({ ...base, metaLeads: 5 }, null), "source_mismatch");
});
