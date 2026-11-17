// The shared Campaign Status scope, the range state of a saved report, and the readable date formats. Synthetic data only.
import assert from "node:assert/strict";
import { test } from "node:test";

import { campaignMatchesFilter, campaignStatusesOf, inCampaignScope } from "@/lib/optimization/campaign-filter";
import { formatIsoDayDmy, formatRangeDmy, formatRunTimestamp } from "@/lib/optimization/format";
import { rangeStateOf } from "@/lib/optimization/range-state";

const rows = [
  { level: "campaign", id: "C-active", status: "active" as const },
  { level: "campaign", id: "C-paused", status: "paused" as const },
  { level: "campaign", id: "C-ended", status: "ended" as const },
  { level: "adset", id: "S-1", status: "paused" as const },
];

test("Active Only keeps active campaigns; Paused / Inactive keeps the rest; All keeps everything", () => {
  assert.equal(campaignMatchesFilter("active", "active"), true);
  assert.equal(campaignMatchesFilter("paused", "active"), false, "a paused campaign is hidden by Active Only");
  assert.equal(campaignMatchesFilter("paused", "inactive"), true);
  assert.equal(campaignMatchesFilter("ended", "inactive"), true);
  assert.equal(campaignMatchesFilter("active", "inactive"), false);
  assert.equal(campaignMatchesFilter("paused", "all"), true, "All shows paused campaigns with their historical spend");
});

test("the campaign statuses come from the campaign rows only", () => {
  const statuses = campaignStatusesOf(rows);
  assert.equal(statuses.get("C-paused"), "paused");
  assert.equal(statuses.has("S-1"), false);
});

test("a unit follows its campaign's status; a unit whose campaign is not listed is only in All", () => {
  const statuses = campaignStatusesOf(rows);
  assert.equal(inCampaignScope("C-paused", statuses, "active"), false);
  assert.equal(inCampaignScope("C-paused", statuses, "all"), true);
  assert.equal(inCampaignScope("C-unlisted", statuses, "active"), false, "an unknown status is never called active");
  assert.equal(inCampaignScope("C-unlisted", statuses, "all"), true);
});

test("a saved report answers only the range on the picker", () => {
  const selected = { since: "2026-11-04", until: "2026-11-04" };
  assert.equal(rangeStateOf(null, selected), "none");
  assert.equal(rangeStateOf({ since: "2026-11-04", until: "2026-11-04" }, selected), "current");
  assert.equal(rangeStateOf({ since: "2026-10-29", until: "2026-11-04" }, selected), "changed", "a 7-day report is not an answer for Today");
});

test("dates read as day.month.year, and a range reads as one phrase", () => {
  assert.equal(formatIsoDayDmy("2026-10-29"), "29.10.2026");
  assert.equal(formatRangeDmy({ since: "2026-10-29", until: "2026-11-04" }), "29.10.2026 – 04.11.2026");
});

test("a run's timestamp is shown in the reporting timezone, to the minute", () => {
  // 12:24 UTC on 4 November 2026 is 14:24 in Israel (UTC+2 after the October change).
  assert.equal(formatRunTimestamp("2026-11-04T12:24:51.000Z"), "04.11.2026 14:24");
  assert.equal(formatRunTimestamp("not a time"), "—");
});
