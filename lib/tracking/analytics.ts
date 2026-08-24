/**
 * Analytics integration points.
 *
 * No IDs are hardcoded here. Each platform activates only when its env var
 * is set, so the app runs cleanly with zero analytics configured today and
 * picks up GTM / GA4 / Meta Pixel later by adding env vars — no code
 * changes required. See AnalyticsScripts for where the tags are injected.
 */

export const analyticsConfig = {
  gtmId: process.env.NEXT_PUBLIC_GTM_ID ?? null,
  ga4Id: process.env.NEXT_PUBLIC_GA4_ID ?? null,
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID ?? null,
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Pushes an event to the GTM data layer. Safe to call even when GTM isn't
 * configured — it just becomes a no-op instead of throwing.
 */
export function pushDataLayerEvent(event: string, data: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || !window.dataLayer) return;
  window.dataLayer.push({ event, ...data });
}

/**
 * Fires a Meta Pixel standard/custom event when the pixel is loaded.
 */
export function trackMetaPixelEvent(eventName: string, data: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq("track", eventName, data);
}

/**
 * Single call-site for "a lead was submitted" so every landing page reports
 * the same event shape to GTM/GA4 and Meta Pixel, regardless of page copy.
 */
export function trackLeadSubmitted(landingPageId: string) {
  pushDataLayerEvent("generate_lead", { landing_page_id: landingPageId });
  trackMetaPixelEvent("Lead", { content_name: landingPageId });
}
