import "server-only";

import type { MetaErrorBody } from "@/lib/advertising/meta/types";

const USAGE_HEADER_NAMES = ["x-business-use-case-usage", "x-ad-account-usage", "x-app-usage"];

function findEstimatedWaitMinutes(value: unknown, depth = 0): number | null {
  if (value === null || typeof value !== "object" || depth > 4) return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findEstimatedWaitMinutes(item, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.estimated_time_to_regain_access === "number" && record.estimated_time_to_regain_access > 0) {
    return Math.ceil(record.estimated_time_to_regain_access);
  }
  for (const nested of Object.values(record)) {
    const found = findEstimatedWaitMinutes(nested, depth + 1);
    if (found !== null) return found;
  }
  return null;
}

/**
 * Best-effort extraction of Meta's own "how long until this account can call
 * again" hint, in whole minutes. Meta exposes `estimated_time_to_regain_access`
 * in a couple of different places depending on the endpoint and throttle type
 * - inside the error body's `error_data` for an ad-account-level block, or
 * inside one of the `X-*-Usage` response headers (JSON-encoded) on other
 * throttled responses. Every read here is defensive (try/catch, optional
 * chaining, returns null rather than throwing) since none of this is
 * documented precisely enough to assume a fixed shape without testing
 * against a live, actually-throttled account - which this integration has
 * not been able to do (see client.ts). Returning null just means the caller
 * falls back to its existing generic "try again in a few minutes" message.
 */
export function extractEstimatedWaitMinutes(body: MetaErrorBody | null, headers: Headers): number | null {
  const fromBody = body?.error?.error_data?.estimated_time_to_regain_access;
  if (typeof fromBody === "number" && fromBody > 0) return Math.ceil(fromBody);

  for (const headerName of USAGE_HEADER_NAMES) {
    const raw = headers.get(headerName);
    if (!raw) continue;
    try {
      const found = findEstimatedWaitMinutes(JSON.parse(raw));
      if (found !== null) return found;
    } catch {
      // Not valid JSON, or not the shape we expect - ignore, not fatal.
    }
  }

  return null;
}
