import "server-only";

import { getCapiConfig, isCapiSendEnabled } from "@/lib/meta-capi/config";
import type { MetaCapiLeadEvent } from "@/lib/meta-capi/build-event";

export class MetaCapiError extends Error {
  /** Non-sensitive technical detail (an HTTP status, never a response body - Meta's own error payloads can echo request data back). */
  detail?: string;

  constructor(message: string, detail?: string) {
    super(message);
    this.name = "MetaCapiError";
    this.detail = detail;
  }
}

/**
 * NOT CALLED ANYWHERE IN PRODUCTION YET - intentionally. This phase's brief
 * is explicit: prepare the infrastructure, do not start sending production
 * Lead events until the user confirms the real Pixel/Dataset ID and CAPI
 * access token (see this phase's final report for exactly what's still
 * needed). Guarded by isCapiSendEnabled() (config.ts), a second, explicit
 * switch on top of the credentials themselves being present - the current
 * caller (app/api/landing-leads/route.ts) invokes this fire-and-forget and
 * swallows exactly the "not enabled" error it throws today, so turning this
 * on later is a one-line env var change, not a code change.
 *
 * Never logs the event or the response body - both can carry hashed PII
 * and, on Meta's side, echoed request data.
 */
export async function sendLeadEvent(event: MetaCapiLeadEvent): Promise<void> {
  if (!isCapiSendEnabled()) {
    throw new MetaCapiError(
      "שליחת אירועי Meta CAPI אינה מופעלת (נדרשים META_PIXEL_ID, META_CAPI_ACCESS_TOKEN ו-META_CAPI_SEND_ENABLED=true)."
    );
  }

  const { pixelId, accessToken, graphApiVersion } = getCapiConfig();
  const url = `https://graph.facebook.com/${graphApiVersion}/${pixelId}/events?access_token=${accessToken}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [event] }),
  });

  if (!response.ok) {
    throw new MetaCapiError(`Meta CAPI השיב בשגיאה (סטטוס ${response.status}).`, `HTTP ${response.status}`);
  }
}
