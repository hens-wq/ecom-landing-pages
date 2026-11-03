import "server-only";

import { checkMetaConfig } from "@/lib/advertising/meta/config";
import { MetaAdvertisingProvider } from "@/lib/advertising/meta/provider";
import { MockAdvertisingProvider } from "@/lib/advertising/mock-provider";
import { buildSpendReconciliation, type AccountSpendResult } from "@/lib/advertising/reconciliation";
import { AdvertisingApiError, type AdvertisingAccountInfo, type AdvertisingResult, type DateRange } from "@/lib/advertising/types";
import { META_NOT_CONFIGURED_MESSAGE, demoDataEnabled } from "@/lib/runtime-mode";

/**
 * The one function every consumer (the /api/advertising route, the
 * Integrations page) calls to get advertising data - it decides mock vs. Meta
 * so nothing else has to.
 *
 *  - Meta not configured at all -> an explicit error. Demo data is served only when ECOM_DEMO_DATA=1 is set on purpose.
 *  - Meta partially configured (one of the two required env vars set, not
 *    both) -> that's a real configuration mistake, throws rather than
 *    silently using mock data.
 *  - Meta fully configured -> live data, or throws AdvertisingApiError if the
 *    call fails for any reason. Never falls back to mock in this case - a
 *    silent fallback here is exactly how you'd end up mistaking fake data for
 *    a real account's numbers.
 */
export async function getAdvertisingData(range: DateRange): Promise<AdvertisingResult> {
  const check = checkMetaConfig();

  if (check.status === "unconfigured") {
    if (!demoDataEnabled()) {
      throw new AdvertisingApiError("not_configured", META_NOT_CONFIGURED_MESSAGE, "Meta env vars are empty and ECOM_DEMO_DATA is not set");
    }
    const provider = new MockAdvertisingProvider();
    const snapshot = await provider.getCampaigns(range);
    return { source: "mock", campaigns: snapshot.campaigns, account: null, unlisted: null, reconciliation: null };
  }

  if (check.status === "incomplete") {
    const missingLabel = check.missing.join(", ");
    throw new AdvertisingApiError(
      check.missing.includes("META_ACCESS_TOKEN") ? "missing_token" : "missing_account_id",
      `הגדרת Meta Ads חסרה: ${missingLabel}. יש להשלים את שני משתני הסביבה (META_ACCESS_TOKEN ו-META_AD_ACCOUNT_ID) כדי להתחבר.`,
      `Missing env vars: ${missingLabel}`
    );
  }

  const provider = new MetaAdvertisingProvider(check.config);
  // The account total is a separate request. If it fails, only the check is weakened; the campaign data still loads.
  const [snapshot, account, accountSpend] = await Promise.all([
    provider.getCampaigns(range),
    provider.getAccountInfo(),
    provider.getAccountSpend(range).then(
      (spend): AccountSpendResult => ({ ok: true, spend }),
      (error: unknown): AccountSpendResult => ({
        ok: false,
        message: error instanceof AdvertisingApiError ? error.message : "שגיאה לא צפויה בקריאת סך ההוצאה בחשבון.",
      })
    ),
  ]);

  const reconciliation = buildSpendReconciliation({
    campaigns: snapshot.campaigns,
    unlisted: snapshot.unlisted,
    excludedSpend: snapshot.excludedSpend,
    accountSpend,
  });
  return { source: "meta", campaigns: snapshot.campaigns, account, unlisted: snapshot.unlisted, reconciliation };
}

export type MetaConnectionStatus =
  | { status: "not_configured" }
  | { status: "connected"; account: AdvertisingAccountInfo }
  | { status: "connection_error"; message: string };

/** Used by the Integrations page to show the Meta Ads card's real state without touching campaign/insights data at all. */
export async function getMetaConnectionStatus(): Promise<MetaConnectionStatus> {
  const check = checkMetaConfig();

  if (check.status === "unconfigured") {
    return { status: "not_configured" };
  }
  if (check.status === "incomplete") {
    return { status: "connection_error", message: `חסרים משתני סביבה: ${check.missing.join(", ")}` };
  }

  try {
    const provider = new MetaAdvertisingProvider(check.config);
    const account = await provider.getAccountInfo();
    if (!account) {
      return { status: "connection_error", message: "לא ניתן היה לקרוא את פרטי חשבון הפרסום." };
    }
    return { status: "connected", account };
  } catch (error) {
    const message = error instanceof AdvertisingApiError ? error.message : "שגיאה לא צפויה בהתחברות ל-Meta.";
    return { status: "connection_error", message };
  }
}

export { checkMetaConfig } from "@/lib/advertising/meta/config";
export { AdvertisingApiError, httpStatusForErrorCode } from "@/lib/advertising/types";
export type { AdvertisingResult, AdvertisingSource, DateRange } from "@/lib/advertising/types";
