export type LeadWebhookHttpStatus = 200 | 400 | 401 | 403 | 404 | 409 | 500 | 503;
export type LeadWebhookReason =
  | "success"
  | "not_configured"
  | "unauthorized"
  | "invalid_json"
  | "rating_scope_violation"
  | "missing_identity"
  | "invalid_status_type"
  | "invalid_rating"
  | "invalid_amount"
  | "invalid_request"
  | "invalid_phone"
  | "not_found"
  | "ambiguous"
  | "database_error"
  | "unexpected_error";

export interface LeadWebhookDiagnostic {
  status: LeadWebhookHttpStatus;
  reason: LeadWebhookReason;
  operation?: "rating" | "status";
  matchedBy?: "lead_id" | "phone";
}

const HTTP_STATUSES: readonly number[] = [200, 400, 401, 403, 404, 409, 500, 503];
const REASONS: readonly string[] = ["success", "not_configured", "unauthorized", "invalid_json", "rating_scope_violation", "missing_identity", "invalid_status_type", "invalid_rating", "invalid_amount", "invalid_request", "invalid_phone", "not_found", "ambiguous", "database_error", "unexpected_error"];

/** Only static, allowlisted diagnostic fields can leave this function. Never
 * serialize request bodies, headers, lead identifiers, ratings or errors. */
export function formatLeadWebhookDiagnostic(input: LeadWebhookDiagnostic): string {
  return JSON.stringify({
    event: "lead_rating_webhook",
    status: HTTP_STATUSES.includes(input.status) ? input.status : 500,
    reason: REASONS.includes(input.reason) ? input.reason : "unexpected_error",
    ...(input.operation === "rating" || input.operation === "status" ? { operation: input.operation } : {}),
    ...(input.matchedBy === "lead_id" || input.matchedBy === "phone" ? { matchedBy: input.matchedBy } : {}),
  });
}
