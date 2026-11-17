import type { CrmCapiConfig } from "@/lib/crm-capi/config";
import type { CrmMetaEvent } from "@/lib/crm-capi/event";

/**
 * Sends ONE event per request. A batch would let one refused event take the
 * others down with it. The result carries short codes only: never the URL
 * (it carries the token), the request body, or Meta's error text.
 *
 * What Meta answered goes to onReport as a sanitized report: HTTP status,
 * events_received, messages, fbtrace_id and, on a refusal, the error type and
 * code. A report never carries the token, the URL, the request body or a lead ID.
 */

export type CrmSendResult = { ok: true } | { ok: false; retryable: boolean; code: string };

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export interface CrmMetaReport {
  httpStatus: number;
  eventsReceived: number | null;
  messages: string[];
  fbtrace_id: string | null;
  error: { type: string | null; code: number | null; subcode: number | null; message: string | null } | null;
}

export type CrmMetaReportHook = (report: CrmMetaReport) => void;

const SEND_TIMEOUT_MS = 10_000;
const MAX_MESSAGES = 5;
const MAX_TEXT = 200;

/**
 * Meta's free text, shortened and stripped of identifiers: runs of 8 or more
 * digits (lead IDs, phone numbers) and token-like strings are masked.
 */
export function sanitizeMetaText(value: unknown, max = MAX_TEXT): string | null {
  if (typeof value !== "string") return null;
  return value.replace(/\d{8,}/g, "<number>").replace(/[A-Za-z0-9_-]{32,}/g, "<redacted>").slice(0, max);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** Never throws: a body that cannot be read still gives a report with the HTTP status. */
async function readReport(httpStatus: number, response: Response): Promise<CrmMetaReport> {
  let body: Record<string, unknown> = {};
  try {
    body = asRecord(await response.json()) ?? {};
  } catch {
    body = {};
  }
  const err = asRecord(body.error);
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .map((item) => sanitizeMetaText(item))
    .filter((item): item is string => item !== null)
    .slice(0, MAX_MESSAGES);
  return {
    httpStatus,
    eventsReceived: typeof body.events_received === "number" ? body.events_received : null,
    messages,
    fbtrace_id: sanitizeMetaText(body.fbtrace_id ?? err?.fbtrace_id, 64),
    error: err
      ? {
          type: sanitizeMetaText(err.type, 64),
          code: typeof err.code === "number" ? err.code : null,
          subcode: typeof err.error_subcode === "number" ? err.error_subcode : null,
          message: sanitizeMetaText(err.message),
        }
      : null,
  };
}

function notify(hook: CrmMetaReportHook | undefined, report: CrmMetaReport): void {
  if (!hook) return;
  try {
    hook(report);
  } catch {
    // Logging must never change the outcome of a send.
  }
}

export async function sendCrmEvent(
  event: CrmMetaEvent,
  config: CrmCapiConfig,
  fetchImpl: FetchLike,
  onReport?: CrmMetaReportHook
): Promise<CrmSendResult> {
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
    notify(onReport, await readReport(response.status, response));
    if (response.ok) return { ok: true };

    // 429 and 5xx are transient. Any other refusal is about this event, so a retry changes nothing.
    const retryable = response.status === 429 || response.status >= 500;
    return { ok: false, retryable, code: `http_${response.status}` };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return { ok: false, retryable: true, code: timedOut ? "timeout" : "network" };
  }
}
