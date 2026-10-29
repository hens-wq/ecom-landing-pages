import "server-only";

import { unstable_cache } from "next/cache";

import { buildGraphUrl } from "@/lib/advertising/meta/client";
import { checkMetaConfig } from "@/lib/advertising/meta/config";
import {
  buildCreativeLookup,
  classifyMetaFailure,
  type CreativeLookup,
  type RawAdNode,
  type RawMetaError,
} from "@/lib/creative/creative-lookup";

const REQUEST_TIMEOUT_MS = 10_000;
/**
 * How long a successful lookup is reused. Reopening the same link costs no Meta
 * call, and a public URL can't keep hitting Meta for the same ad.
 */
const CACHE_REVALIDATE_SECONDS = 300;

/**
 * Only answers about the ad itself are cached. Rate limits, permission problems
 * and network failures are transient, so the next visit must ask Meta again.
 */
const CACHEABLE_STATUSES: ReadonlySet<CreativeLookup["status"]> = new Set(["ok", "not_found", "removed", "unavailable"]);

/** The only fields requested from Meta, so nothing beyond them can reach the page. */
const AD_FIELDS = [
  "id",
  "name",
  "account_id",
  "effective_status",
  "adset{name}",
  "campaign{name}",
  "creative{title,body,object_type,image_url,thumbnail_url,video_id,object_story_spec,asset_feed_spec}",
].join(",");

/** Carries a transient result out of the cache layer: the page gets it, the cache never stores it. */
class TransientLookupError extends Error {
  readonly lookup: CreativeLookup;

  constructor(lookup: CreativeLookup) {
    super(`Creative lookup not cached: ${lookup.status}`);
    this.lookup = lookup;
  }
}

/**
 * Reads the config here rather than taking it as an argument: the arguments of an
 * unstable_cache function become part of its cache key, and the token must never
 * end up in a cache key.
 */
async function requestAdFromMeta(adId: string): Promise<CreativeLookup> {
  const check = checkMetaConfig();
  if (check.status !== "ready") return { status: "not_configured" };

  const url = buildGraphUrl(check.config, adId, { fields: AD_FIELDS });
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch {
    // Not logged: the error can carry the request URL, and the URL carries the access token.
    console.error("[creative] Meta request did not complete");
    return { status: "meta_error" };
  }

  const body = (await response.json().catch(() => null)) as (RawAdNode & { error?: RawMetaError }) | null;
  if (!response.ok) return { status: classifyMetaFailure(response.status, body?.error) };
  if (!body) return { status: "meta_error" };

  return buildCreativeLookup(body, check.config.adAccountId.replace(/^act_/, ""), adId);
}

const lookupAdCached = unstable_cache(
  async (adId: string): Promise<CreativeLookup> => {
    const lookup = await requestAdFromMeta(adId);
    if (!CACHEABLE_STATUSES.has(lookup.status)) throw new TransientLookupError(lookup);
    return lookup;
  },
  ["creative-lookup"],
  { revalidate: CACHE_REVALIDATE_SECONDS },
);

/** Everything the creative page needs for one Ad ID. Never throws, so the page always renders. */
export async function lookupAdCreative(adId: string): Promise<CreativeLookup> {
  try {
    return await lookupAdCached(adId);
  } catch (error) {
    if (error instanceof TransientLookupError) {
      console.warn(`[creative] Meta lookup returned ${error.lookup.status}`);
      return error.lookup;
    }
    console.error("[creative] unexpected error while loading the ad creative");
    return { status: "meta_error" };
  }
}
