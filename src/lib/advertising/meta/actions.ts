import type { MetaActionEntry } from "@/lib/advertising/meta/types";

/**
 * Meta's `actions` field on an Insights row is a flat list of EVERY tracked
 * action type for that ad (link clicks, post engagements, video views, page
 * likes, purchases, leads, ...) - it is NOT safe to assume any single entry,
 * or even "the biggest number", represents a Lead. This allowlist is the one
 * and only place that decides what counts as a Lead, specifically so it's
 * easy to inspect and extend without touching the mapper or provider.
 *
 * Included on purpose:
 *  - "lead": the standard/legacy action type for Meta Lead Ads (native lead forms).
 *  - "onsite_conversion.lead_grouped": current Graph API versions report
 *    on-Meta lead-form submissions under this grouped action type.
 *  - "onsite_conversion.lead": seen on some ad account configurations for the
 *    same on-Meta lead-form conversion, ungrouped.
 *
 * Deliberately NOT included: anything under "offsite_conversion.*" (those are
 * Pixel/Conversions API events - out of scope until that phase) and generic
 * "lead" look-alikes like "onsite_conversion.messaging_conversation_started_7d"
 * (a messaging action, not a lead form submission).
 *
 * If your ad account uses a different / custom conversion event for leads, it
 * will show up as 0 leads until you add its action_type here - check the
 * server logs (logRawActionsForDebugging below) to see exactly what Meta
 * returned for a given ad.
 */
const LEAD_ACTION_TYPES = new Set(["lead", "onsite_conversion.lead_grouped", "onsite_conversion.lead"]);

export function parseLeadsFromActions(actions: MetaActionEntry[] | undefined): number {
  if (!actions || actions.length === 0) return 0;

  return actions
    .filter((action) => LEAD_ACTION_TYPES.has(action.action_type))
    .reduce((total, action) => {
      const value = Number(action.value);
      return total + (Number.isFinite(value) ? value : 0);
    }, 0);
}

/**
 * Server-side-only debug aid: dumps the raw actions array for an ad so a
 * developer can see exactly what Meta returned (e.g. to discover a custom
 * conversion's action_type that should be added to LEAD_ACTION_TYPES above).
 * Silent unless META_DEBUG_ACTIONS=1, and only ever runs server-side (this
 * module is only imported from other server-only advertising/meta files).
 */
export function logRawActionsForDebugging(adId: string, actions: MetaActionEntry[] | undefined): void {
  if (process.env.META_DEBUG_ACTIONS !== "1") return;
  console.log(`[meta actions] ad ${adId}:`, JSON.stringify(actions ?? []));
}
