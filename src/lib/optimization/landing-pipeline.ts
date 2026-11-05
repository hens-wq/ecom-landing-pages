import { isExcludedCampaignId } from "@/lib/campaign-scope";
import { classifyAttribution, listedIdsOf, type AttributionOutcome } from "@/lib/performance/attribution";
import type { Campaign } from "@/lib/types";

/**
 * The read-only landing-page diagnostic: where each landing-page lead of one range goes, from the database to a campaign.
 * Pure. It takes the rows and the listing and returns counts and a few technical samples. The samples carry IDs and times
 * only: never a name, a phone number or an e-mail. Each step uses the rules of the run: the excluded campaigns first, then
 * the listed ad, ad set and campaign by ID, never by name. Nothing here writes, and nothing here changes a lead.
 */

export interface LandingPipelineRow {
  internalLeadId: string;
  submittedAt: string;
  /** The campaign ID the lead carries: its own campaign_id, or a numeric utm_campaign. */
  campaignId: string | null;
  adSetId: string | null;
  adId: string | null;
}

export interface LandingPipelineInput {
  range: { since: string; until: string };
  /** "failed" when the database read did not succeed: then no row is counted and the data is not complete. */
  dbState: "ok" | "failed";
  rows: LandingPipelineRow[];
  /** The listing of the same window, read the way a run reads it. Null when Meta's listing did not load. */
  campaigns: Campaign[] | null;
  /** The campaign chosen for the diagnosis, by its ID. */
  selectedCampaignId: string | null;
}

export type LandingSampleOutcome = AttributionOutcome | "excluded_campaign" | "listing_unavailable";

export interface LandingSample {
  internalLeadId: string;
  submittedAt: string;
  campaignId: string | null;
  adSetId: string | null;
  adId: string | null;
  outcome: LandingSampleOutcome;
  outcomeText: string;
}

export interface LandingStage {
  key: "db_read" | "excluded_campaign" | "in_analysis" | "attributed" | "selected_campaign" | "unassigned";
  label: string;
  /** Null when the step could not be computed (for example, the listing did not load). */
  count: number | null;
  reason: string;
}

export interface LandingPipelineReport {
  range: { since: string; until: string };
  dbState: "ok" | "failed";
  listingState: "ok" | "unavailable";
  stages: LandingStage[];
  samples: LandingSample[];
  complete: boolean;
  completeNote: string;
  selectedCampaignId: string | null;
}

/** What the diagnostic route returns: a report, or the reason no report can be made (no database, demo mode). */
export type LandingDiagnosticResponse = { state: "report"; report: LandingPipelineReport } | { state: "unavailable"; message: string };

export const LANDING_SAMPLE_LIMIT = 5;

const OUTCOME_TEXT: Record<LandingSampleOutcome, string> = {
  ad: "משויך למודעה ברשימה",
  adset: "משויך לסט מודעות ברשימה",
  campaign: "משויך לקמפיין ברשימה",
  unassigned_no_ids: "לא שויך: בלי מזהה כלל",
  unassigned_id_not_listed: "לא שויך: מזהה שלא ברשימה",
  excluded_campaign: "הוסר: קמפיין שאינו קורס",
  listing_unavailable: "לא שויך: רשימת הקמפיינים לא נטענה",
};

interface RowResult {
  outcome: LandingSampleOutcome;
  owningCampaignId: string | null;
}

/** Samples that explain a gap come first: unplaced leads, then the selected campaign's leads, then the rest. */
function rankOf(result: RowResult, selectedCampaignId: string | null): number {
  if (result.outcome === "unassigned_no_ids" || result.outcome === "unassigned_id_not_listed" || result.outcome === "listing_unavailable") {
    return 0;
  }
  if (selectedCampaignId !== null && result.owningCampaignId === selectedCampaignId) return 1;
  if (result.outcome === "excluded_campaign") return 3;
  return 2;
}

export function buildLandingPipeline(input: LandingPipelineInput): LandingPipelineReport {
  const loaded = input.dbState === "ok" ? input.rows : [];
  const listed = input.campaigns === null ? null : listedIdsOf(input.campaigns);

  // Every listed ad set and ad belongs to one campaign: that is how a lead reaches its campaign by ID.
  const owner = new Map<string, string>();
  for (const campaign of input.campaigns ?? []) {
    owner.set(campaign.id, campaign.id);
    for (const adSet of campaign.adSets) {
      owner.set(adSet.id, campaign.id);
      for (const ad of adSet.ads) owner.set(ad.id, campaign.id);
    }
  }

  const results = new Map<string, RowResult>();
  const counts = { ad: 0, adset: 0, campaign: 0, noIds: 0, idNotListed: 0, selected: 0, excluded: 0, analysed: 0 };

  for (const row of loaded) {
    if (isExcludedCampaignId(row.campaignId)) {
      counts.excluded += 1;
      results.set(row.internalLeadId, { outcome: "excluded_campaign", owningCampaignId: null });
      continue;
    }
    counts.analysed += 1;
    if (listed === null) {
      results.set(row.internalLeadId, { outcome: "listing_unavailable", owningCampaignId: null });
      continue;
    }

    const outcome = classifyAttribution(row, listed);
    const owningCampaignId =
      outcome === "ad" && row.adId ? (owner.get(row.adId) ?? null)
      : outcome === "adset" && row.adSetId ? (owner.get(row.adSetId) ?? null)
      : outcome === "campaign" ? row.campaignId
      : null;
    results.set(row.internalLeadId, { outcome, owningCampaignId });

    if (outcome === "ad") counts.ad += 1;
    else if (outcome === "adset") counts.adset += 1;
    else if (outcome === "campaign") counts.campaign += 1;
    else if (outcome === "unassigned_no_ids") counts.noIds += 1;
    else counts.idNotListed += 1;
    if (input.selectedCampaignId !== null && owningCampaignId === input.selectedCampaignId) counts.selected += 1;
  }

  const attributed = listed === null ? null : counts.ad + counts.adset + counts.campaign;
  const unassigned = listed === null ? null : counts.noIds + counts.idNotListed;
  const selectedCount = listed === null || input.selectedCampaignId === null ? null : counts.selected;

  const stages: LandingPipelineReport["stages"] = [
    {
      key: "db_read",
      label: "נטענו מ-Neon בטווח",
      count: input.dbState === "ok" ? input.rows.length : 0,
      reason:
        input.dbState === "ok"
          ? "קריאה אחת של כל לידי דף הנחיתה בטווח, בלי הגבלת מספר שורות בשאילתה."
          : "הקריאה ממסד הנתונים נכשלה: הנתונים אינם שלמים.",
    },
    {
      key: "excluded_campaign",
      label: "הוסרו: קמפיין שאינו קורס",
      count: counts.excluded,
      reason: "לפי מזהה קמפיין, כמו בכל הדוחות. הרשומות לא נמחקו.",
    },
    {
      key: "in_analysis",
      label: "נכנסו לניתוח",
      count: counts.analysed,
      reason: "נכנסו לחישוב של הדוח.",
    },
    {
      key: "attributed",
      label: "שויכו לקמפיין, סט מודעות או מודעה ברשימה",
      count: attributed,
      reason: listed === null ? "לא חושב: רשימת הקמפיינים מ-Meta לא נטענה." : "לפי מזהה בלבד, מהמודעה כלפי מעלה.",
    },
    {
      key: "selected_campaign",
      label: "שויכו לקמפיין שנבחר",
      count: selectedCount,
      reason:
        input.selectedCampaignId === null
          ? "לא נבחר קמפיין להשוואה."
          : `מזהה הקמפיין שנבחר: ${input.selectedCampaignId}`,
    },
    {
      key: "unassigned",
      label: "לא שויכו לאף יחידה",
      count: unassigned,
      reason:
        listed === null
          ? "לא חושב: רשימת הקמפיינים מ-Meta לא נטענה."
          : `בלי מזהה כלל: ${counts.noIds} · מזהה שלא ברשימה: ${counts.idNotListed}`,
    },
  ];

  const ranked = loaded
    .map((row, index) => ({ row, index, result: results.get(row.internalLeadId) }))
    .filter((entry): entry is { row: LandingPipelineRow; index: number; result: RowResult } => entry.result !== undefined)
    .sort(
      (a, b) =>
        rankOf(a.result, input.selectedCampaignId) - rankOf(b.result, input.selectedCampaignId) || a.index - b.index
    )
    .slice(0, LANDING_SAMPLE_LIMIT);

  const samples: LandingSample[] = ranked.map(({ row, result }) => ({
    internalLeadId: row.internalLeadId,
    submittedAt: row.submittedAt,
    campaignId: row.campaignId,
    adSetId: row.adSetId,
    adId: row.adId,
    outcome: result.outcome,
    outcomeText: OUTCOME_TEXT[result.outcome],
  }));

  const complete = input.dbState === "ok" && listed !== null;
  const completeNote = complete
    ? "הנתונים שלמים לטווח: הקריאה הצליחה ורשימת הקמפיינים נטענה."
    : input.dbState !== "ok"
      ? "הנתונים אינם שלמים: הקריאה ממסד הנתונים נכשלה."
      : "הנתונים אינם שלמים לשיוך: רשימת הקמפיינים מ-Meta לא נטענה.";

  return {
    range: input.range,
    dbState: input.dbState,
    listingState: listed === null ? "unavailable" : "ok",
    stages,
    samples,
    complete,
    completeNote,
    selectedCampaignId: input.selectedCampaignId,
  };
}
