import { timingSafeEqual } from "node:crypto";

export type LeadStatusWebhookScope = "status" | "rating";

export interface LeadStatusWebhookSecrets {
  statusSecret?: string | null;
  ratingSecret?: string | null;
}

export function hasLeadStatusWebhookSecret(secrets: LeadStatusWebhookSecrets): boolean {
  return Boolean(secrets.statusSecret?.trim() || secrets.ratingSecret?.trim());
}

function matchesSecret(provided: string, configured: string | null | undefined): boolean {
  const secret = configured?.trim();
  if (!secret) return false;
  const providedBuffer = Buffer.from(provided);
  const configuredBuffer = Buffer.from(secret);
  return providedBuffer.length === configuredBuffer.length && timingSafeEqual(providedBuffer, configuredBuffer);
}

/** Keep the existing status credential valid while allowing an independent,
 * restricted credential for a Fireberry rating automation. */
export function authorizeLeadStatusWebhook(
  authorization: string | null,
  secrets: LeadStatusWebhookSecrets,
): LeadStatusWebhookScope | null {
  const provided = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
  if (!provided) return null;

  const statusMatch = matchesSecret(provided, secrets.statusSecret);
  const ratingMatch = matchesSecret(provided, secrets.ratingSecret);
  // Existing status authorization takes precedence if an operator configured
  // the same value twice. Adding rating support must not restrict legacy sync.
  if (statusMatch) return "status";
  if (ratingMatch) return "rating";
  return null;
}

const STATUS_AND_PAYMENT_FIELDS = ["mainStatus", "secondaryStatus", "fullPaymentAmount", "partialPaymentAmount"] as const;

/** Any presence is forbidden for the restricted key, including null or an
 * empty string. Rating validation and lead matching remain separate checks. */
export function isRatingOnlyWebhookPayload(payload: Record<string, unknown>): boolean {
  return STATUS_AND_PAYMENT_FIELDS.every((field) => !Object.prototype.hasOwnProperty.call(payload, field));
}
