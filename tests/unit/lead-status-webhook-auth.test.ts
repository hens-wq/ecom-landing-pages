import assert from "node:assert/strict";
import { test } from "node:test";

import { authorizeLeadStatusWebhook, hasLeadStatusWebhookSecret, isRatingOnlyWebhookPayload } from "@/lib/lead-status/webhook-auth";

const secrets = { statusSecret: "test-legacy-status-token", ratingSecret: "test-restricted-rating-token" };

test("adding a rating credential preserves the existing status credential and gives each its scope", () => {
  assert.equal(authorizeLeadStatusWebhook(`Bearer ${secrets.statusSecret}`, secrets), "status");
  assert.equal(authorizeLeadStatusWebhook(`Bearer ${secrets.ratingSecret}`, secrets), "rating");
  assert.equal(authorizeLeadStatusWebhook(`Bearer ${secrets.statusSecret}`, { statusSecret: secrets.statusSecret }), "status");
  assert.equal(authorizeLeadStatusWebhook(`Bearer ${secrets.ratingSecret}`, { ratingSecret: secrets.ratingSecret }), "rating");
});

test("missing, malformed, wrong and unequal-length bearer credentials fail closed", () => {
  for (const header of [null, "", "Bearer ", "Basic test-legacy-status-token", "bearer test-legacy-status-token", "Bearer wrong", "Bearer test-legacy-status-tokeN", "Bearer test-restricted-rating-tokeN"]) {
    assert.equal(authorizeLeadStatusWebhook(header, secrets), null, String(header));
  }
  assert.equal(authorizeLeadStatusWebhook("Bearer test-legacy-status-token", {}), null);
});

test("whitespace handling remains compatible and identical configured keys retain legacy status scope", () => {
  assert.equal(authorizeLeadStatusWebhook("Bearer   test-legacy-status-token  ", { statusSecret: "  test-legacy-status-token  " }), "status");
  assert.equal(authorizeLeadStatusWebhook(`Bearer ${secrets.statusSecret}`, { statusSecret: secrets.statusSecret, ratingSecret: secrets.statusSecret }), "status");
});

test("endpoint is configured when either credential is present; blank credentials never authorize", () => {
  assert.equal(hasLeadStatusWebhookSecret({}), false);
  assert.equal(hasLeadStatusWebhookSecret({ statusSecret: " ", ratingSecret: "\n" }), false);
  assert.equal(hasLeadStatusWebhookSecret({ statusSecret: secrets.statusSecret }), true);
  assert.equal(hasLeadStatusWebhookSecret({ ratingSecret: secrets.ratingSecret }), true);
  assert.equal(authorizeLeadStatusWebhook("Bearer \n", { statusSecret: " ", ratingSecret: "\n" }), null);
});

test("restricted key permits raw/canonical rating, explicit clear and lead identity fields", () => {
  for (const payload of [
    { leadId: "known-dashboard-id", pcfsystemfield350: 9 },
    { phone: "0500000001", studentRating: 4 },
    { leadId: "known-dashboard-id", pcfsystemfield350: null },
    { leadId: "known-dashboard-id", pcfsystemfield350: 9, studentRating: 4 },
  ]) assert.equal(isRatingOnlyWebhookPayload(payload), true);
});

test("restricted key forbids every status/payment field by presence, including null, empty and undefined", () => {
  for (const field of ["mainStatus", "secondaryStatus", "fullPaymentAmount", "partialPaymentAmount"]) {
    for (const value of ["נרשם", "", null, 0, 1500, undefined]) {
      assert.equal(isRatingOnlyWebhookPayload({ leadId: "known-dashboard-id", pcfsystemfield350: 9, [field]: value }), false, field);
    }
  }
});
