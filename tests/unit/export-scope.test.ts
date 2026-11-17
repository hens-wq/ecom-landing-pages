// Every course-analysis export excludes recruitment IDs and explicit hiring names. Synthetic fixtures only.
import assert from "node:assert/strict";
import { test } from "node:test";

import { courseLeads, isCourseLead } from "@/lib/leads/course-scope";
import { buildLeadExportCsv, toLeadExportRow } from "@/lib/leads/export";
import type { MetaFormLead } from "@/lib/leads/types";

const RECRUITMENT_ID = "120248773681350125";
const COURSE_ID = "900000000000000001";
const OTHER_ID = "900000000000000002";

function lead(id: string, campaignId: string, campaignName: string): MetaFormLead {
  return {
    id,
    createdTime: "2026-11-03T08:00:00.000Z",
    name: null,
    phone: null,
    normalizedPhone: null,
    email: null,
    formId: "form-test",
    campaignId,
    campaignName,
    adSetId: "as-test",
    adSetName: "סדרה בדיקה",
    adId: "ad-test",
    adName: "מודעה בדיקה",
    sourceType: "meta_standard_form",
  };
}

const LEADS = [
  lead("lead-course", COURSE_ID, "קורס בדיקה"),
  lead("lead-recruit", RECRUITMENT_ID, "דרושים | אנשי מכירות"),
  lead("lead-same-name", OTHER_ID, "דרושים | אנשי מכירות"),
  lead("lead-employment-course", "900000000000000003", "לשכת התעסוקה"),
];

test("a lead from the verified recruitment campaign is not a course lead, by ID", () => {
  assert.equal(isCourseLead(LEADS[1]), false);
  assert.equal(isCourseLead(LEADS[0]), true);
});

test("a new recruitment campaign with an explicit hiring name is also excluded", () => {
  assert.equal(isCourseLead(LEADS[2]), false);
  assert.equal(isCourseLead(LEADS[3]), true);
});

test("the course filter keeps every other lead, including leads without a campaign", () => {
  const withoutCampaign = lead("lead-no-campaign", "", "");
  assert.deepEqual(courseLeads([...LEADS, withoutCampaign]).map((item) => item.id), ["lead-course", "lead-employment-course", "lead-no-campaign"]);
});

test("the agent CSV contains no row, and no campaign ID, from the excluded campaign", () => {
  const rows = courseLeads(LEADS).map((item) => toLeadExportRow(item, undefined));
  const csv = buildLeadExportCsv(rows);
  assert.ok(csv.includes(COURSE_ID), "course leads are in the file");
  assert.ok(!csv.includes(OTHER_ID), "a new explicitly named recruitment campaign is absent from the file");
  assert.ok(csv.includes("900000000000000003"), "a course campaign about employment remains in the file");
  assert.ok(!csv.includes(RECRUITMENT_ID), "the excluded campaign's ID never appears in the file");
  assert.equal(rows.length, 2);
});


test("snapshot exclusions filter future ID-only landing and fact records before exports or dashboard attribution", () => {
  const snapshotExclusions = [{ id: "future-landing-recruiter", name: "דרושים | רכזת גיוס | דף נחיתה" }];
  const futureLanding = lead("lead-future-landing", "future-landing-recruiter", "future-landing-recruiter");
  const course = lead("lead-work-course", "work-course", "נקודות כאב בעבודה");
  assert.deepEqual(courseLeads([futureLanding, course], snapshotExclusions).map((item) => item.id), ["lead-work-course"]);
  const facts = [
    { id: "fact-future-landing", campaignId: "future-landing-recruiter" },
    { id: "fact-course", campaignId: "work-course" },
  ];
  assert.deepEqual(courseLeads(facts, snapshotExclusions).map((item) => item.id), ["fact-course"]);
});
