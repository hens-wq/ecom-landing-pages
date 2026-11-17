import assert from "node:assert/strict";
import { test } from "node:test";

import { formatLeadWebhookDiagnostic, type LeadWebhookDiagnostic } from "@/lib/lead-status/webhook-diagnostic";

test("webhook outcomes have a stable event, HTTP status and controlled reason", () => {
  for (const [status, reason] of [[200, "success"], [400, "invalid_rating"], [401, "unauthorized"], [403, "rating_scope_violation"], [404, "not_found"], [409, "ambiguous"], [500, "unexpected_error"], [503, "database_error"]] as const) {
    assert.deepEqual(JSON.parse(formatLeadWebhookDiagnostic({ status, reason })), { event: "lead_rating_webhook", status, reason });
  }
});

test("successful events may expose only operation and matching method, never the matched identity", () => {
  const diagnostic = {
    status: 200,
    reason: "success",
    operation: "rating",
    matchedBy: "phone",
    leadId: "private-lead-id",
    phone: "private-phone",
    name: "private-name",
    rating: 4,
    studentRating: 4,
    secret: "private-secret",
    headers: { authorization: "Bearer private-credential" },
    body: { pcfsystemfield350: 9 },
    payment: 18000,
    error: new Error("private-driver-error"),
  } as LeadWebhookDiagnostic;
  assert.deepEqual(JSON.parse(formatLeadWebhookDiagnostic(diagnostic)), { event: "lead_rating_webhook", status: 200, reason: "success", operation: "rating", matchedBy: "phone" });
});

test("runtime values outside the diagnostic allowlist cannot leak through typed fields", () => {
  const unsafe = { status: "private-status", reason: "private-error-message", operation: "private-operation", matchedBy: "private-phone" } as unknown as LeadWebhookDiagnostic;
  assert.deepEqual(JSON.parse(formatLeadWebhookDiagnostic(unsafe)), { event: "lead_rating_webhook", status: 500, reason: "unexpected_error" });
});
