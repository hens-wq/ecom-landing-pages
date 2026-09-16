import type { LandingLeadInput } from "@/lib/landing-leads/types";

export type LandingLeadValidationResult = { ok: true; input: LandingLeadInput } | { ok: false; error: string };

const MAX_TEXT_LENGTH = 500;

function trimmedOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, MAX_TEXT_LENGTH) : null;
}

/**
 * The only two fields this app can actually act on for a lead - everything
 * else (attribution IDs, UTMs, email) is optional and stored as-given
 * (or null), since a lead with a name and phone is still a real lead worth
 * keeping even if the landing page's attribution capture failed for some
 * reason (network, ad blocker, an old cached page). Never silently invents a
 * name or phone that wasn't submitted.
 */
export function validateLandingLeadInput(body: unknown): LandingLeadValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "גוף הבקשה חסר או אינו תקין." };
  }
  const record = body as Record<string, unknown>;

  const name = trimmedOrNull(record.name);
  if (!name) return { ok: false, error: "שם הליד חסר." };

  const phone = trimmedOrNull(record.phone);
  if (!phone) return { ok: false, error: "מספר הטלפון חסר." };

  const submittedAtRaw = trimmedOrNull(record.submitted_at);
  const submittedAt = submittedAtRaw && !Number.isNaN(Date.parse(submittedAtRaw)) ? submittedAtRaw : null;

  return {
    ok: true,
    input: {
      name,
      phone,
      email: trimmedOrNull(record.email),
      submittedAt,
      landingPageUrl: trimmedOrNull(record.landing_page_url),
      campaignId: trimmedOrNull(record.campaign_id),
      adSetId: trimmedOrNull(record.adset_id),
      adId: trimmedOrNull(record.ad_id),
      utmSource: trimmedOrNull(record.utm_source),
      utmMedium: trimmedOrNull(record.utm_medium),
      utmCampaign: trimmedOrNull(record.utm_campaign),
      utmContent: trimmedOrNull(record.utm_content),
      utmTerm: trimmedOrNull(record.utm_term),
      fbclid: trimmedOrNull(record.fbclid),
      placement: trimmedOrNull(record.placement),
      siteSource: trimmedOrNull(record.site_source),
    },
  };
}
