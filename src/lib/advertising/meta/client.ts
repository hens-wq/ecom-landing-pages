import "server-only";

import { AdvertisingApiError } from "@/lib/advertising/types";
import type { MetaConfig } from "@/lib/advertising/meta/config";
import type { MetaErrorBody, MetaListResponse } from "@/lib/advertising/meta/types";

const GRAPH_BASE_URL = "https://graph.facebook.com";
const REQUEST_TIMEOUT_MS = 15_000;
/** Defensive cap so a very large ad account (or an API bug) can't loop forever following `paging.next`. */
const MAX_PAGES = 50;

/** Meta's own numeric error codes for expired/invalid auth and rate limiting. */
const INVALID_TOKEN_CODES = new Set([190]);
const RATE_LIMIT_CODES = new Set([4, 17, 32, 613]);
const PERMISSION_CODES = new Set([10, 200, 299]);

function mapMetaError(httpStatus: number, body: MetaErrorBody | null): AdvertisingApiError {
  const error = body?.error;
  const detail = error ? `${error.type ?? "Error"} (code ${error.code ?? "?"}): ${error.message}` : `HTTP ${httpStatus}`;

  if (error?.code !== undefined) {
    if (INVALID_TOKEN_CODES.has(error.code)) {
      return new AdvertisingApiError("invalid_token", "טוקן הגישה ל-Meta אינו תקין או שפג תוקפו. יש להנפיק טוקן חדש.", detail);
    }
    if (RATE_LIMIT_CODES.has(error.code)) {
      return new AdvertisingApiError("rate_limited", "חריגה ממכסת הבקשות ל-Meta API. נסו שוב בעוד מספר דקות.", detail);
    }
    if (PERMISSION_CODES.has(error.code)) {
      return new AdvertisingApiError(
        "permission_error",
        "אין הרשאה לגשת לחשבון הפרסום. ודאו שלטוקן יש הרשאת ads_read לחשבון זה.",
        detail
      );
    }
  }

  if (httpStatus === 401) {
    return new AdvertisingApiError("invalid_token", "טוקן הגישה ל-Meta אינו תקין או שפג תוקפו.", detail);
  }
  if (httpStatus === 403) {
    return new AdvertisingApiError("permission_error", "אין הרשאה לגשת לחשבון הפרסום ב-Meta.", detail);
  }
  if (httpStatus === 429) {
    return new AdvertisingApiError("rate_limited", "חריגה ממכסת הבקשות ל-Meta API. נסו שוב בעוד מספר דקות.", detail);
  }
  if (httpStatus === 404) {
    return new AdvertisingApiError("missing_account_id", "חשבון הפרסום לא נמצא. בדקו את META_AD_ACCOUNT_ID.", detail);
  }

  return new AdvertisingApiError("api_error", "שגיאה בתקשורת מול Meta API.", detail);
}

async function metaFetch(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal, cache: "no-store" });
  } catch (cause) {
    if (cause instanceof Error && cause.name === "AbortError") {
      throw new AdvertisingApiError("network_error", "הבקשה ל-Meta API ארכה זמן רב מדי (timeout).");
    }
    throw new AdvertisingApiError("network_error", "לא ניתן להתחבר לשרתי Meta. בדקו את החיבור לאינטרנט.", String(cause));
  } finally {
    clearTimeout(timeout);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new AdvertisingApiError("api_error", "תגובה לא תקינה מ-Meta API.", `HTTP ${response.status}`);
  }

  const body = json as Partial<MetaErrorBody>;
  if (!response.ok || body?.error) {
    throw mapMetaError(response.status, body?.error ? (body as MetaErrorBody) : null);
  }

  return json;
}

/** Builds a Graph API URL. `params` must NOT include the access token - that's added here so no call site can forget it. */
export function buildGraphUrl(config: MetaConfig, path: string, params: Record<string, string>): string {
  const url = new URL(`${GRAPH_BASE_URL}/${config.apiVersion}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("access_token", config.accessToken);
  return url.toString();
}

/** Fetches every page of a Graph API list endpoint, following `paging.next` (which already carries the access token Meta echoes back). */
export async function fetchAllPages<T>(firstPageUrl: string): Promise<T[]> {
  const items: T[] = [];
  let nextUrl: string | undefined = firstPageUrl;
  let pageCount = 0;

  while (nextUrl && pageCount < MAX_PAGES) {
    const page = (await metaFetch(nextUrl)) as MetaListResponse<T>;
    items.push(...(page.data ?? []));
    nextUrl = page.paging?.next;
    pageCount += 1;
  }

  return items;
}

/** Fetches a single (non-list) Graph API node, e.g. the ad account itself. */
export async function fetchNode<T>(url: string): Promise<T> {
  return (await metaFetch(url)) as T;
}
