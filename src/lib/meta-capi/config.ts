import "server-only";

/**
 * Meta Conversions API credentials - server-side only, never exposed to the
 * client (no NEXT_PUBLIC_ prefix), matching every other secret in this app
 * (see src/lib/advertising/meta/config.ts). Never hardcode a Pixel/Dataset
 * ID or access token - always these two env vars.
 */
export interface CapiConfig {
  pixelId: string | null;
  accessToken: string | null;
  graphApiVersion: string;
}

export function getCapiConfig(): CapiConfig {
  return {
    pixelId: process.env.META_PIXEL_ID?.trim() || null,
    accessToken: process.env.META_CAPI_ACCESS_TOKEN?.trim() || null,
    // Reuses the same Graph API version the read-only Ads/Leads integration
    // already uses (see lib/advertising/meta/config.ts) - one Meta App, one
    // API version to track, not a second one to keep in sync.
    graphApiVersion: process.env.META_GRAPH_API_VERSION?.trim() || "v26.0",
  };
}

export function isCapiConfigured(): boolean {
  const { pixelId, accessToken } = getCapiConfig();
  return Boolean(pixelId && accessToken);
}

/**
 * A second, explicit gate on top of isCapiConfigured(): credentials being
 * present is not the same as being told to actually start sending. This
 * phase's brief is explicit - build the infrastructure, do not start
 * sending production Lead events until the user confirms the real
 * Pixel/Dataset ID and access token. Requires META_CAPI_SEND_ENABLED="true"
 * IN ADDITION to both credentials, so setting the credentials alone (e.g. a
 * copy-paste into Vercel env vars before this conversation is resolved)
 * can never accidentally start sending real events.
 */
export function isCapiSendEnabled(): boolean {
  return isCapiConfigured() && (process.env.META_CAPI_SEND_ENABLED?.trim().toLowerCase() ?? "") === "true";
}
