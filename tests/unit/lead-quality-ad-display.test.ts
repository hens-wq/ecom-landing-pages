import assert from "node:assert/strict";
import { test } from "node:test";

import { formatAdName, groupAdsByAdSet } from "@/components/lead-quality/quality-cards";
import { buildLeadQualityReport } from "@/lib/lead-quality";
import type { LeadQualityAd } from "@/lib/lead-quality/types";
import type { Campaign } from "@/lib/types";

const campaign: Campaign = {
  id: "ad-display-campaign", name: "קמפיין שמות", status: "active", objective: "Leads",
  adSets: [{
    id: "source-adset", name: "סדרה מקורית", campaignId: "ad-display-campaign", status: "active",
    ads: [{
      id: "source-ad", name: "שם מקורי", adSetId: "source-adset", status: "active", destinationType: "meta_standard_form",
      metrics: { spend: 0, impressions: 0, reach: 0, linkClicks: 0, leads: 0, sales: 0, revenue: 0 },
    }],
  }],
};
const originalAd = buildLeadQualityReport({ campaigns: [campaign], leads: [], range: { since: "2026-11-01", until: "2026-11-07" } }).campaigns[0].ads[0];

function ad(id: string, adSetId: string | null, adSetName: string | null, name = id): LeadQualityAd {
  return { ...originalAd, id, adSetId, adSetName, name };
}

test("ad display names keep their actual names, add one prefix, and strip edge direction marks", () => {
  assert.equal(formatAdName("1"), "מודעה 1");
  assert.equal(formatAdName("וידאו קורס סייבר"), "מודעה וידאו קורס סייבר");
  assert.equal(formatAdName("מודעה 1"), "מודעה 1");
  assert.equal(formatAdName("מודעה: וידאו"), "מודעה: וידאו");
  assert.equal(formatAdName("מודעה3"), "מודעה3");
  assert.equal(formatAdName("  \u200F\u200Eמודעה 1\u200F  "), "מודעה 1");
  assert.equal(formatAdName("\u2067\u200F  מודעה: קורס\u2069"), "מודעה: קורס");
  assert.equal(formatAdName("\u200Fסרטון מרצה"), "מודעה סרטון מרצה");
  assert.equal(formatAdName("מודעות חדשות"), "מודעה מודעות חדשות", "a different Hebrew word must not be mistaken for the singular prefix");
  assert.equal(formatAdName("\u200F  "), "מודעה ללא שם");
});

test("ad-set grouping follows first source appearance, keeps ad order, and never merges distinct IDs with equal names", () => {
  const input = Object.freeze([
    Object.freeze(ad("a-2", "set-b", "אותו שם", "שם ראשון")),
    Object.freeze(ad("a-1", "set-a", "אותו שם", "מודעה מקורית")),
    Object.freeze(ad("a-3", "set-b", "אותו שם", "שם שלישי")),
    Object.freeze(ad("a-4", "set-a", "אותו שם", "שם רביעי")),
  ]);
  const grouped = groupAdsByAdSet(input);
  assert.deepEqual(grouped.map((group) => group.id), ["id:set-b", "id:set-a"]);
  assert.deepEqual(grouped.map((group) => group.ads.map((entry) => entry.id)), [["a-2", "a-3"], ["a-1", "a-4"]]);
  assert.deepEqual(grouped.map((group) => group.name), ["אותו שם", "אותו שם"]);
  assert.strictEqual(grouped[0].ads[0], input[0], "grouping must retain actual ad objects rather than invent names or IDs");
  assert.deepEqual(input.map((entry) => entry.name), ["שם ראשון", "מודעה מקורית", "שם שלישי", "שם רביעי"]);
});

test("missing ad-set attribution stays separate and a later known name fills only a missing group name", () => {
  const grouped = groupAdsByAdSet([
    ad("a-1", "known-set", null),
    ad("a-2", null, "סדרה ללא מזהה"),
    ad("a-3", null, null),
    ad("a-4", "known-set", "סדרה מוכרת"),
    ad("a-5", null, "סדרה ללא מזהה"),
  ]);
  assert.deepEqual(grouped.map((group) => group.name), ["סדרה מוכרת", "סדרה ללא מזהה", "לא ידועה"]);
  assert.deepEqual(grouped.map((group) => group.ads.map((entry) => entry.id)), [["a-1", "a-4"], ["a-2", "a-5"], ["a-3"]]);
});
