import "server-only";

import { unstable_cache } from "next/cache";

import { checkMetaConfig } from "@/lib/advertising/meta/config";
import { AdvertisingApiError } from "@/lib/advertising/types";
import { fetchAllLeadsFromMeta } from "@/lib/leads/meta/fetch-all";
import { assertNotCoolingDown, recordRateLimit } from "@/lib/leads/meta/rate-limit-guard";
import type { MetaFormLead } from "@/lib/leads/types";

/**
 * How long a successful full-account lead fetch stays cached before Meta is
 * called again. This is the primary fix for the "changing the date range
 * re-triggers the whole fetch" rate-limit bug: every date range and filter
 * combination the Leads page can show within this window is served from the
 * same cached snapshot, with zero additional Meta calls. Kept short (rather
 * than e.g. 5+ minutes) because "Today" is exactly the kind of fast-moving
 * bucket someone will want to cross-check against Ads Manager - the manual
 * "רענון נתונים" button (see app/leads/page.tsx + api/leads/route.ts) bypasses
 * this entirely via revalidateTag(LEADS_CACHE_TAG) for an on-demand fresh
 * pull, so this number only bounds how stale *automatic* loads can be.
 */
const CACHE_REVALIDATE_SECONDS = 60;

/** Shared with api/leads/route.ts, which calls revalidateTag(LEADS_CACHE_TAG) on an explicit user-triggered refresh (never automatically). */
export const LEADS_CACHE_TAG = "meta-leads";

/**
 * Deliberately takes no arguments and re-derives config from checkMetaConfig()
 * itself, rather than receiving MetaConfig (which carries the access token)
 * as a parameter - unstable_cache uses a function's arguments as part of its
 * cache key, and the token should never become part of that key material.
 * There is only one Meta ad account per deployment (env-var configured), so
 * a single, argument-less cache entry is all this needs.
 */
async function fetchAndCache(): Promise<MetaFormLead[]> {
  assertNotCoolingDown();

  const check = checkMetaConfig();
  if (check.status !== "ready") {
    // Can't happen in practice - the caller (MetaLeadsProvider) is only ever
    // constructed after this same check already returned "ready". Guarded
    // anyway since this function re-derives config independently instead of
    // receiving it as an argument (see above).
    throw new AdvertisingApiError(
      "api_error",
      "תצורת Meta לא הייתה זמינה בזמן טעינת הלידים.",
      "checkMetaConfig() was not ready inside the cached leads fetch"
    );
  }

  try {
    return await fetchAllLeadsFromMeta(check.config);
  } catch (error) {
    if (error instanceof AdvertisingApiError && error.code === "rate_limited") {
      recordRateLimit(error.retryAfterMinutes, error.message);
    }
    throw error;
  }
}

const getCachedLeadsInternal = unstable_cache(fetchAndCache, ["meta-all-leads"], {
  revalidate: CACHE_REVALIDATE_SECONDS,
  tags: [LEADS_CACHE_TAG],
});

/**
 * All Instant Form leads for the configured ad account, across its whole
 * history, cached across requests (see CACHE_REVALIDATE_SECONDS above). A
 * rate-limited failure is never cached as if it were data - see
 * rate-limit-guard.ts for what stops repeated requests from immediately
 * retrying Meta while a real rate limit is still in effect.
 */
export function getCachedMetaLeads(): Promise<MetaFormLead[]> {
  return getCachedLeadsInternal();
}
