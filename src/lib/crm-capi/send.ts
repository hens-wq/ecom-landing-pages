import type { CrmCapiConfig } from "@/lib/crm-capi/config";
import type { CrmMetaEvent } from "@/lib/crm-capi/event";

/**
 * Sends ONE event per request. A batch would let one refused event take the
 * others down with it. Errors come back as short codes only: never the URL
 * (it carries the token), the request body, or Meta's error text.
 */

export type CrmSendResult = { ok: true } | { ok: false; retryable: boolean; code: string };

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

const SEND_TIMEOUT_MS = 10_000;

export async function sendCrmEvent(event: CrmMetaEvent, config: CrmCapiConfig, fetchImpl: FetchLike): Promise<CrmSendResult> {
  if (!config.datasetId || !config.accessToken) return { ok: false, retryable: false, code: "config_missing" };

  const url =
    `https://graph.facebook.com/${config.graphApiVersion}/${encodeURIComponent(config.datasetId)}/events` +
    `?access_token=${encodeURIComponent(config.accessToken)}`;
  const body = { data: [event], ...(config.testEventCode ? { test_event_code: config.testEventCode } : {}) };

  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    if (response.ok) return { ok: true };

    void response.body?.cancel().catch(() => {});
    // 429 and 5xx are transient. Any other refusal is about this event, so a retry changes nothing.
    const retryable = response.status === 429 || response.status >= 500;
    return { ok: false, retryable, code: `http_${response.status}` };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return { ok: false, retryable: true, code: timedOut ? "timeout" : "network" };
  }
}
