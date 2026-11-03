import type { Campaign, RawMetrics } from "@/lib/types";

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

/** What a provider returns for one range: the listed hierarchy, plus any delivery the listing did not cover. */
export interface AdvertisingSnapshot {
  campaigns: Campaign[];
  /**
   * Delivery (spend, impressions, reach, link clicks) of ads that spent in the range but are not in the listed
   * hierarchy: archived or deleted ads, or ads whose ad set or campaign was not returned. Null when there are none.
   * Lead figures are never read from Meta here.
   */
  unlisted: RawMetrics | null;
  /** Spend of the excluded (non-course) campaigns in the range. The account total includes it, so the check subtracts it. */
  excludedSpend: number;
}

export type ReconciliationStatus = "ok" | "gap" | "unavailable";

/** The check that the spend the app sums matches the account's own total for the same range. */
export interface SpendReconciliation {
  status: ReconciliationStatus;
  /** The account total from Meta's account-level Insights. Null when that request failed. */
  accountSpend: number | null;
  /** What the app sums: every listed course ad, plus the unlisted course delivery. */
  summedSpend: number;
  /** Spend of excluded (non-course) campaigns that the account total includes. It is removed before comparing. */
  excludedSpend: number;
  /** accountSpend minus summedSpend. Null when the account total is unknown. */
  difference: number | null;
  /** One Hebrew sentence for the UI. */
  message: string;
}

export interface AdvertisingResult {
  source: AdvertisingSource;
  campaigns: Campaign[];
  account: AdvertisingAccountInfo | null;
  /** Delivery of ads outside the listing, shown as their own row so every total still adds up. Null in demo mode. */
  unlisted: RawMetrics | null;
  /** The spend check against the account total. Null in demo mode. */
  reconciliation: SpendReconciliation | null;
}

export interface AdvertisingDataProvider {
  readonly source: AdvertisingSource;
  getCampaigns(range: DateRange): Promise<AdvertisingSnapshot>;
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
  | "not_configured"
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
  /** Meta's own "try again in N minutes" hint for rate-limited errors, when it provided one - see meta/rate-limit.ts. Null when Meta didn't say (the generic message is used instead). */
  retryAfterMinutes: number | null;

  constructor(code: AdvertisingErrorCode, message: string, detail?: string, retryAfterMinutes: number | null = null) {
    super(message);
    this.name = "AdvertisingApiError";
    this.code = code;
    this.detail = detail;
    this.retryAfterMinutes = retryAfterMinutes;
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
    case "not_configured":
      return 503;
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
