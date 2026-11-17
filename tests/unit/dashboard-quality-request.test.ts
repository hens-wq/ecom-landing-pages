import assert from "node:assert/strict";
import { test } from "node:test";

import { parseLeadQualityRequest } from "@/lib/lead-quality-request";

test("status analysis accepts a single day, leap dates, and each campaign scope", () => {
  for (const campaignStatus of ["active", "inactive", "all"]) {
    assert.deepEqual(
      parseLeadQualityRequest(new URLSearchParams({ since: "2024-02-29", until: "2024-02-29", campaignStatus })),
      { range: { since: "2024-02-29", until: "2024-02-29" }, campaignStatus },
    );
  }
  assert.equal(parseLeadQualityRequest(new URLSearchParams("since=2026-11-01&until=2026-11-11"))?.campaignStatus, "active");
});

test("status analysis rejects missing, normalized-overflow, datetime and reversed ranges before loading sources", () => {
  for (const query of [
    "", "since=2026-11-11", "since=2026-02-29&until=2026-03-01", "since=2026-02-31&until=2026-03-03",
    "since=2026-11-11T00:00:00Z&until=2026-11-12", "since=2026-11-12&until=2026-11-11",
    "since=2026-11-01&until=2026-11-11&campaignStatus=unrecognized",
  ]) {
    assert.equal(parseLeadQualityRequest(new URLSearchParams(query)), null, query);
  }
});
