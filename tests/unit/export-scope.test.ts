// Every course-analysis export leaves out the excluded campaign's leads, by Campaign ID only. Synthetic fixtures only.
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
];

test("a lead from the verified recruitment campaign is not a course lead, by ID", () => {
  assert.equal(isCourseLead(LEADS[1]), false);
  assert.equal(isCourseLead(LEADS[0]), true);
});

test("a campaign with the same name but another ID is a course lead, because only the ID counts", () => {
  assert.equal(isCourseLead(LEADS[2]), true);
});

test("the course filter keeps every other lead, including leads without a campaign", () => {
  const withoutCampaign = lead("lead-no-campaign", "", "");
  assert.deepEqual(courseLeads([...LEADS, withoutCampaign]).map((item) => item.id), ["lead-course", "lead-same-name", "lead-no-campaign"]);
});

test("the agent CSV contains no row, and no campaign ID, from the excluded campaign", () => {
  const rows = courseLeads(LEADS).map((item) => toLeadExportRow(item, undefined));
  const csv = buildLeadExportCsv(rows);
  assert.ok(csv.includes(COURSE_ID), "course leads are in the file");
  assert.ok(csv.includes(OTHER_ID), "a same-name campaign with another ID is in the file");
  assert.ok(!csv.includes(RECRUITMENT_ID), "the excluded campaign's ID never appears in the file");
  assert.equal(rows.length, 2);
});
