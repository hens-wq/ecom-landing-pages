import "server-only";

import { unstable_cache } from "next/cache";

import { checkMetaConfig } from "@/lib/advertising/meta/config";
import { mapStatus } from "@/lib/advertising/meta/mapper";
import { fetchCampaignNodes } from "@/lib/advertising/meta/nodes";
import { AdvertisingApiError } from "@/lib/advertising/types";
import { campaigns as mockCampaigns } from "@/lib/mock-data/campaigns";
import type { EntityStatus } from "@/lib/types";

/**
 * A separate, additive read of Meta's campaign statuses for the "סטטוס
 * קמפיין (Campaign Status)" filter on the Leads page - does NOT touch
 * lib/leads/* (the lead-retrieval pipeline) at all, on purpose: that pipeline
 * is explicitly not to be changed. Reuses fetchCampaignNodes (already used,
 * unmodified, by the advertising provider) and the same mapStatus() the
 * Dashboard's hierarchy table already uses, so "active" here means the exact
 * same thing it means everywhere else in the app.
 */
export type CampaignStatusMap = Record<string, EntityStatus>;

const CACHE_REVALIDATE_SECONDS = 60;

async function fetchAndCacheCampaignStatuses(): Promise<CampaignStatusMap> {
  const check = checkMetaConfig();
  if (check.status !== "ready") {
    // Can't happen in practice - getCampaignStatuses() below only calls this
    // once it has already confirmed "ready". Guarded anyway since this
    // function re-derives config independently (same reasoning as
    // lib/leads/meta/cache.ts - keeps the access token out of the cache key).
    throw new AdvertisingApiError(
      "api_error",
      "תצורת Meta לא הייתה זמינה בזמן טעינת סטטוסי קמפיינים.",
      "checkMetaConfig() was not ready inside the cached campaign-status fetch"
    );
  }

  const campaignNodes = await fetchCampaignNodes(check.config);
  const map: CampaignStatusMap = {};
  for (const node of campaignNodes) {
    map[node.id] = mapStatus(node);
  }
  return map;
}

const getCachedMetaCampaignStatuses = unstable_cache(fetchAndCacheCampaignStatuses, ["meta-campaign-statuses"], {
  revalidate: CACHE_REVALIDATE_SECONDS,
  tags: ["meta-campaign-statuses"],
});

/** Mirrors the mock/incomplete/ready branching every other Meta-backed data source in this app uses (see lib/leads/index.ts, lib/advertising/index.ts). */
export async function getCampaignStatuses(): Promise<CampaignStatusMap> {
  const check = checkMetaConfig();

  if (check.status === "unconfigured") {
    const map: CampaignStatusMap = {};
    for (const campaign of mockCampaigns) map[campaign.id] = campaign.status;
    return map;
  }

  if (check.status === "incomplete") {
    const missingLabel = check.missing.join(", ");
    throw new AdvertisingApiError(
      check.missing.includes("META_ACCESS_TOKEN") ? "missing_token" : "missing_account_id",
      `הגדרת Meta Ads חסרה: ${missingLabel}.`,
      `Missing env vars: ${missingLabel}`
    );
  }

  return getCachedMetaCampaignStatuses();
}
