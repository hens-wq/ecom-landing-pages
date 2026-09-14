import type { MetaActionEntry } from "@/lib/advertising/meta/types";

/**
 * Meta's `actions` field on an Insights row is a flat list of EVERY tracked
 * action type for that ad (link clicks, post engagements, video views, page
 * likes, purchases, leads, ...) - it is NOT safe to assume any single entry
 * represents a Lead, and it is NOT safe to sum multiple lead-shaped entries
 * together either.
 *
 * Phase 2A summed "lead" + "onsite_conversion.lead_grouped" +
 * "onsite_conversion.lead" and produced a Leads total that didn't match Ads
 * Manager. The reason: for on-Facebook/Instagram Lead Ads (Instant Forms),
 * these action types are NOT independent events - they are the SAME
 * underlying submitted-lead conversions, reported under more than one
 * action_type label depending on API version / grouping behavior
 * ("onsite_conversion.lead_grouped" is the current de-duplicated, grouped
 * count; "onsite_conversion.lead" and the legacy "lead" type can appear
 * alongside it describing the identical conversions ungrouped). Summing them
 * counts every real lead two or three times.
 *
 * The fix: treat this as a PRIORITY list, not a sum. Use the first action_type
 * present, in this order:
 *   1. "onsite_conversion.lead_grouped" - Meta's current canonical, de-duplicated
 *      count for on-platform Lead Ads. This is what Ads Manager's "Results"
 *      column reads for a Lead Generation campaign in current API versions,
 *      so it's tried first.
 *   2. "onsite_conversion.lead" - the same conversion, seen on some account/API
 *      configurations when the grouped variant isn't present.
 *   3. "lead" - the legacy action type, used as a last-resort fallback only.
 *
 * `sourceActionType` on the result says exactly which one was used for a given
 * ad, specifically so this can be verified against Ads Manager's Results
 * column for the same campaign/date range rather than trusted blindly - see
 * README verification steps. `rawActions` is the untouched list Meta returned
 * (type + numeric value only, never personal data) for the same reason.
 *
 * Deliberately NOT included: anything under "offsite_conversion.*" (Pixel/
 * Conversions API events - out of scope until that phase) and non-lead
 * look-alikes like "onsite_conversion.messaging_conversation_started_7d".
 *
 * If your ad account uses a different/custom conversion event for leads, it
 * will show up as 0 leads until its action_type is added to this list - set
 * META_DEBUG_ACTIONS=1 and check server logs (never client-visible) to see
 * exactly what Meta returned for a given ad and add it here.
 */
const LEAD_ACTION_TYPE_PRIORITY = ["onsite_conversion.lead_grouped", "onsite_conversion.lead", "lead"];

export interface LeadCountResult {
  leads: number;
  /** Which action_type's value was used, or null if none of LEAD_ACTION_TYPE_PRIORITY was present. */
  sourceActionType: string | null;
  /** Meta's full, untouched actions list for this row (type + count only - no personal data). */
  rawActions: MetaActionEntry[];
}

export function parseLeadsFromActions(actions: MetaActionEntry[] | undefined): LeadCountResult {
  const rawActions = actions ?? [];

  for (const actionType of LEAD_ACTION_TYPE_PRIORITY) {
    const entry = rawActions.find((action) => action.action_type === actionType);
    if (!entry) continue;
    const value = Number(entry.value);
    return { leads: Number.isFinite(value) ? value : 0, sourceActionType: actionType, rawActions };
  }

  return { leads: 0, sourceActionType: null, rawActions };
}

/**
 * Server-side-only debug aid: prints the raw actions list AND which one was
 * picked as Leads for an ad, so a developer can compare against Ads Manager's
 * Results column for the same campaign/date range. Contains only action
 * types and counts (never personal data) - safe to enable in any environment.
 * Silent unless META_DEBUG_ACTIONS=1.
 */
export function logLeadParsingForDebugging(adId: string, result: LeadCountResult): void {
  if (process.env.META_DEBUG_ACTIONS !== "1") return;
  console.log(
    `[meta actions] ad ${adId}: leads=${result.leads} sourceActionType=${result.sourceActionType ?? "none"} rawActions=${JSON.stringify(result.rawActions)}`
  );
}
