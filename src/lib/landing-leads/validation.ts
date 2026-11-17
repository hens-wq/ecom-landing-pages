import type { LandingLeadInput } from "@/lib/landing-leads/types";

export type LandingLeadValidationResult = { ok: true; input: LandingLeadInput } | { ok: false; error: string };

const MAX_TEXT_LENGTH = 500;

/** A Meta ID is digits only. An empty value, or an unfilled template such as {{campaign.id}}, is not an ID. */
const META_ID_PATTERN = /^\d{5,25}$/;

function trimmedOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, MAX_TEXT_LENGTH) : null;
}

/**
 * A Meta ID as text, or null. A bare JSON number is never trusted here: an 18-digit ID loses digits as a JS number, so
 * parseLandingLeadBody reads those fields as text before this check runs.
 */
export function metaIdOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return META_ID_PATTERN.test(trimmed) ? trimmed : null;
}

/**
 * Parses the request body as JSON. The Meta ID fields are read as text even when they arrive as bare numbers: JSON.parse
 * rounds an 18-digit number such as 120248773681350125 before any check could see it, so those values are quoted first.
 */
export function parseLandingLeadBody(text: string): { ok: true; value: unknown } | { ok: false } {
  const withIdsQuoted = text.replace(
    /("(?:campaign_id|adset_id|ad_id)"\s*:\s*)(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)(?=\s*[,}\]])/g,
    '$1"$2"'
  );
  try {
    return { ok: true, value: JSON.parse(withIdsQuoted) };
  } catch {
    return { ok: false };
  }
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
      campaignId: metaIdOrNull(record.campaign_id),
      adSetId: metaIdOrNull(record.adset_id),
      adId: metaIdOrNull(record.ad_id),
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
