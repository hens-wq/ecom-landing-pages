import "server-only";

/**
 * The ONLY place in the codebase that reads Meta credentials from
 * process.env. Deliberately marked `server-only` (throws a build error if any
 * client component tries to import it) as a second line of defense on top of
 * never using a NEXT_PUBLIC_ prefix - either mistake would normally leak the
 * token into the browser bundle, this makes that mistake impossible to ship.
 */
export interface MetaConfig {
  accessToken: string;
  /** Always normalized to include the "act_" prefix. */
  adAccountId: string;
  appId: string | null;
  apiVersion: string;
}

const DEFAULT_GRAPH_API_VERSION = "v26.0";

function normalizeAdAccountId(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.startsWith("act_") ? trimmed : `act_${trimmed}`;
}

export type MetaConfigCheck =
  | { status: "unconfigured" }
  | { status: "incomplete"; missing: Array<"META_ACCESS_TOKEN" | "META_AD_ACCOUNT_ID"> }
  | { status: "ready"; config: MetaConfig };

/**
 * Whether Meta is configured at all, and if so, whether that configuration is
 * usable. Three outcomes on purpose:
 *  - "unconfigured": neither value is set - expected default state, use mock data.
 *  - "incomplete": someone set ONE of the two required values but not the
 *    other - this is a real configuration mistake, not a "not set up yet"
 *    state, so callers should surface it as an error rather than silently
 *    using mock data.
 *  - "ready": both required values are present (their validity against Meta's
 *    servers is only known once an actual API call is made).
 */
export function checkMetaConfig(): MetaConfigCheck {
  const accessToken = process.env.META_ACCESS_TOKEN?.trim() || "";
  const adAccountIdRaw = process.env.META_AD_ACCOUNT_ID?.trim() || "";

  if (!accessToken && !adAccountIdRaw) {
    return { status: "unconfigured" };
  }

  const missing: Array<"META_ACCESS_TOKEN" | "META_AD_ACCOUNT_ID"> = [];
  if (!accessToken) missing.push("META_ACCESS_TOKEN");
  if (!adAccountIdRaw) missing.push("META_AD_ACCOUNT_ID");
  if (missing.length > 0) {
    return { status: "incomplete", missing };
  }

  return {
    status: "ready",
    config: {
      accessToken,
      adAccountId: normalizeAdAccountId(adAccountIdRaw),
      appId: process.env.META_APP_ID?.trim() || null,
      apiVersion: process.env.META_GRAPH_API_VERSION?.trim() || DEFAULT_GRAPH_API_VERSION,
    },
  };
}
