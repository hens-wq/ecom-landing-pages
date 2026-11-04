// Landing-page lead IDs: exact digits, placeholders refused, and the utm_campaign ID fallback. Synthetic values only.
import assert from "node:assert/strict";
import { test } from "node:test";

import { metaIdOrNull, parseLandingLeadBody, validateLandingLeadInput } from "@/lib/landing-leads/validation";
import type { LandingLeadRecord } from "@/lib/landing-leads/types";
import { landingCampaignId } from "@/lib/performance/load-lead-facts";

const EIGHTEEN_DIGITS = "120248773681350125"; // above 2^53: a JS number would round it

test("an unquoted 18-digit campaign ID keeps every digit as text", () => {
  const parsed = parseLandingLeadBody(`{"name":"ליד","phone":"0501234567","campaign_id": ${EIGHTEEN_DIGITS}}`);
  assert.equal(parsed.ok, true);
  assert.equal((parsed.value as { campaign_id: unknown }).campaign_id, EIGHTEEN_DIGITS);
});

test("unquoted adset_id and ad_id are kept as text too, and quoted IDs stay as they are", () => {
  const parsed = parseLandingLeadBody(`{"adset_id":${EIGHTEEN_DIGITS},"ad_id":"23850000000000001","campaign_id":"120000000000000002"}`);
  assert.equal(parsed.ok, true);
  const body = parsed.value as { adset_id: unknown; ad_id: unknown; campaign_id: unknown };
  assert.equal(body.adset_id, EIGHTEEN_DIGITS);
  assert.equal(body.ad_id, "23850000000000001");
  assert.equal(body.campaign_id, "120000000000000002");
});

test("a body that is not JSON is refused, not guessed at", () => {
  assert.equal(parseLandingLeadBody("{not json").ok, false);
});

test("a Meta ID is digits only: a placeholder, an empty value or a bare number is not an ID", () => {
  assert.equal(metaIdOrNull(EIGHTEEN_DIGITS), EIGHTEEN_DIGITS);
  assert.equal(metaIdOrNull(`  ${EIGHTEEN_DIGITS} `), EIGHTEEN_DIGITS, "surrounding spaces are removed");
  assert.equal(metaIdOrNull("{{campaign.id}}"), null, "an unfilled template is not an ID");
  assert.equal(metaIdOrNull(""), null);
  assert.equal(metaIdOrNull(EIGHTEEN_DIGITS.slice(0, 3)), null, "too short to be a Meta ID");
  assert.equal(metaIdOrNull(12345678), null, "a number is never trusted as an ID");
});

test("the validated lead keeps the digits of its IDs and drops a placeholder", () => {
  const result = validateLandingLeadInput({
    name: "ליד סינתטי",
    phone: "0501234567",
    campaign_id: EIGHTEEN_DIGITS,
    ad_id: "{{ad.id}}",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.input.campaignId, EIGHTEEN_DIGITS);
  assert.equal(result.input.adId, null);
});

function record(fields: { campaignId?: string | null; utmCampaign?: string | null }): LandingLeadRecord {
  return { campaignId: null, utmCampaign: null, ...fields } as unknown as LandingLeadRecord;
}

test("a landing lead's campaign is its campaign ID, or a numeric ID sent as utm_campaign, never a name", () => {
  assert.equal(landingCampaignId(record({ campaignId: EIGHTEEN_DIGITS })), EIGHTEEN_DIGITS);
  assert.equal(landingCampaignId(record({ utmCampaign: EIGHTEEN_DIGITS })), EIGHTEEN_DIGITS, "a numeric utm_campaign is an ID");
  assert.equal(landingCampaignId(record({ utmCampaign: "מלגה אביב" })), null, "a campaign name is never matched");
  assert.equal(landingCampaignId(record({ campaignId: "120000000000000002", utmCampaign: EIGHTEEN_DIGITS })), "120000000000000002", "the explicit ID wins");
});
