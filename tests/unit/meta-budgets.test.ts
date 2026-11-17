// Synthetic Meta budget responses only: no credentials, live requests, or mutations.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";

import { mapMetaHierarchyToCampaigns } from "@/lib/advertising/meta/mapper";
import type { MetaAdSetNode, MetaCampaignNode } from "@/lib/advertising/meta/types";

type RawBudget = Pick<MetaCampaignNode, "daily_budget" | "lifetime_budget">;

function campaignWithBudgets(campaignBudget: RawBudget = {}, adSetBudget: RawBudget = {}) {
  const campaign: MetaCampaignNode = { id: "course", name: "לימודי הייטק", status: "ACTIVE", ...campaignBudget };
  const adSet: MetaAdSetNode = { id: "course-set", name: "סדרה", campaign_id: campaign.id, status: "ACTIVE", ...adSetBudget };
  return mapMetaHierarchyToCampaigns(
    [campaign],
    [adSet],
    [{ id: "course-ad", name: "מודעה", campaign_id: campaign.id, adset_id: adSet.id, status: "ACTIVE" }],
    [{ ad_id: "course-ad", campaign_id: campaign.id, adset_id: adSet.id, spend: "688", impressions: "8879" }],
  ).campaigns[0];
}

test("current configured budgets convert integer agorot to ILS independently at each owner level", () => {
  const campaign = campaignWithBudgets({ daily_budget: "15000" }, { daily_budget: 5025 });
  assert.deepEqual(campaign.budget, { daily: 150, lifetime: null });
  assert.deepEqual(campaign.adSets[0].budget, { daily: 50.25, lifetime: null });
  assert.equal(campaign.adSets[0].ads[0].metrics.spend, 688, "Insights spend already uses major units and is unchanged");
});

test("lifetime budgets remain lifetime amounts and are never converted into daily amounts", () => {
  const campaign = campaignWithBudgets({ daily_budget: "0", lifetime_budget: "100000" }, { lifetime_budget: "450000" });
  assert.deepEqual(campaign.budget, { daily: 0, lifetime: 1000 });
  assert.deepEqual(campaign.adSets[0].budget, { daily: null, lifetime: 4500 });
});

test("missing budgets remain unknown despite delivery spend and never inherit another owner's budget", () => {
  const unknown = campaignWithBudgets();
  assert.deepEqual(unknown.budget, { daily: null, lifetime: null });
  assert.deepEqual(unknown.adSets[0].budget, { daily: null, lifetime: null });

  const atCampaign = campaignWithBudgets({ daily_budget: "15000" });
  assert.deepEqual(atCampaign.adSets[0].budget, { daily: null, lifetime: null }, "campaign budget is not copied into its children");

  const atAdSet = campaignWithBudgets({}, { daily_budget: "15000" });
  assert.deepEqual(atAdSet.budget, { daily: null, lifetime: null }, "ad set budgets are not summed into a configured campaign budget");
});

test("invalid Meta amounts stay unknown rather than becoming zero, NaN or Infinity", () => {
  const invalid: unknown[] = [undefined, null, "", "  ", "abc", "15000oops", "-1", -1, "1.5", 1.5, "1e4", "0x10", "Infinity", Infinity, NaN, Number.MAX_SAFE_INTEGER + 1, "9007199254740992", false, {}];
  for (const value of invalid) {
    const raw = { daily_budget: value, lifetime_budget: value } as RawBudget;
    const campaign = campaignWithBudgets(raw, raw);
    assert.deepEqual(campaign.budget, { daily: null, lifetime: null }, `campaign input ${String(value)}`);
    assert.deepEqual(campaign.adSets[0].budget, { daily: null, lifetime: null }, `ad set input ${String(value)}`);
  }
  assert.deepEqual(campaignWithBudgets({ daily_budget: " 15000 " }).budget, { daily: 150, lifetime: null });
});

test("one malformed field does not erase another valid budget field", () => {
  const campaign = campaignWithBudgets({ daily_budget: "bad", lifetime_budget: "500000" }, { daily_budget: "12000", lifetime_budget: "bad" });
  assert.deepEqual(campaign.budget, { daily: null, lifetime: 5000 });
  assert.deepEqual(campaign.adSets[0].budget, { daily: 120, lifetime: null });
});

test("budget metadata is fetched from Meta listing fields through GET only", () => {
  // server-only's documented React-server condition lets the real fetchers run in an isolated Node process.
  // Stub every fetch before importing them, so this test cannot contact Meta.
  const script = `
    import assert from "node:assert/strict";
    const requests = [];
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      requests.push({ url, method: init?.method ?? "GET" });
      const isCampaign = url.pathname.endsWith("/campaigns");
      return Response.json({ data: isCampaign
        ? [{ id: "course", name: "Course", daily_budget: "15000" }]
        : [{ id: "course-set", name: "Set", campaign_id: "course", lifetime_budget: "500000" }] });
    };
    const imported = await import("./src/lib/advertising/meta/nodes.ts");
    const nodes = imported.default ?? imported;
    const config = { adAccountId: "act_synthetic", apiVersion: "v26.0", accessToken: "synthetic-token" };
    const campaigns = await nodes.fetchCampaignNodes(config);
    const adSets = await nodes.fetchAdSetNodes(config);
    assert.equal(campaigns[0].daily_budget, "15000");
    assert.equal(adSets[0].lifetime_budget, "500000");
    assert.equal(requests.length, 2);
    assert.deepEqual(requests.map(({ url }) => url.pathname), ["/v26.0/act_synthetic/campaigns", "/v26.0/act_synthetic/adsets"]);
    for (const request of requests) {
      assert.equal(request.method, "GET");
      const fields = request.url.searchParams.get("fields").split(",");
      assert.ok(fields.includes("daily_budget"));
      assert.ok(fields.includes("lifetime_budget"));
    }
  `;
  execFileSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "--input-type=module", "-e", script], {
    cwd: process.cwd(),
    stdio: "pipe",
    timeout: 15_000,
  });
});
