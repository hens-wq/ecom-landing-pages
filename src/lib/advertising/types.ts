import type { Campaign } from "@/lib/types";

/**
 * The advertising-data boundary. Everything on either side of this file only
 * ever talks in terms of these types - a UI component that consumes
 * `AdvertisingResult` has no idea whether the campaigns inside it came from
 * `mock-provider.ts` or from a live Meta Graph API call, and Meta's own
 * response shapes (see meta/types.ts) never leak past `meta/mapper.ts`.
 */

export interface DateRange {
  /** Inclusive start date, "YYYY-MM-DD". */
  since: string;
  /** Inclusive end date, "YYYY-MM-DD". */
  until: string;
}

export interface AdvertisingAccountInfo {
  id: string;
  name: string;
}

export type AdvertisingSource = "mock" | "meta";

export interface AdvertisingResult {
  source: AdvertisingSource;
  campaigns: Campaign[];
  account: AdvertisingAccountInfo | null;
}

export interface AdvertisingDataProvider {
  readonly source: AdvertisingSource;
  getCampaigns(range: DateRange): Promise<Campaign[]>;
  getAccountInfo(): Promise<AdvertisingAccountInfo | null>;
}

/**
 * Every failure mode this integration is expected to hit, each mapped to a
 * Hebrew, user-safe message. Never includes token/secret values - see
 * lib/advertising/meta/client.ts where these are constructed.
 */
export type AdvertisingErrorCode =
  | "missing_token"
  | "missing_account_id"
  | "invalid_token"
  | "permission_error"
  | "rate_limited"
  | "empty_account"
  | "network_error"
  | "api_error"
  | "bad_request"
  | "unknown_error";

export class AdvertisingApiError extends Error {
  code: AdvertisingErrorCode;
  /** Non-sensitive technical detail (Meta's own error message/fbtrace_id), safe to log or show to a developer - never a token. */
  detail?: string;

  constructor(code: AdvertisingErrorCode, message: string, detail?: string) {
    super(message);
    this.name = "AdvertisingApiError";
    this.code = code;
    this.detail = detail;
  }
}

/** HTTP status to use when a route handler turns an AdvertisingApiError into a JSON response. */
export function httpStatusForErrorCode(code: AdvertisingErrorCode): number {
  switch (code) {
    case "bad_request":
      return 400;
    case "invalid_token":
    case "missing_token":
      return 401;
    case "permission_error":
      return 403;
    case "missing_account_id":
    case "empty_account":
      return 404;
    case "rate_limited":
      return 429;
    case "network_error":
      return 502;
    case "api_error":
    case "unknown_error":
    default:
      return 500;
  }
}
