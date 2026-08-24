/**
 * Identifiers for every landing page the platform will eventually serve.
 * Only "brand-cyber" is built today; the rest exist here so shared code
 * (tracking, lead payloads, analytics) can already be typed against the
 * full route map without guessing at strings later.
 */
export const LANDING_PAGE_IDS = [
  "brand-cyber",
  "brand-ai",
  "brand-digital-marketing",
  "brand-hightech",
  "general-cyber",
  "general-ai",
  "general-hightech",
] as const;

export type LandingPageId = (typeof LANDING_PAGE_IDS)[number];

export interface UtmParams {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
  gclid: string | null;
}

export interface TrackingContext extends UtmParams {
  pageUrl: string;
  landingPageId: LandingPageId;
}

export interface LeadFormValues {
  fullName: string;
  phone: string;
  email: string;
}

export type LeadPayload = LeadFormValues & TrackingContext;

export type LeadSubmissionStatus = "idle" | "submitting" | "success" | "error";

export interface LeadSubmissionResult {
  ok: boolean;
  error?: string;
}
