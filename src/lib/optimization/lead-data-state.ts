import type { Tone } from "@/lib/optimization/labels";
import type { AttributionGaps } from "@/lib/performance/attribution";

/**
 * The state of one unit's lead data, read from its own figures and the window's attribution gaps. It describes the data
 * only: it never changes a rule's threshold. It is shown next to every unit's leads, so a zero never appears without its reason.
 *  - ok: Meta and the dashboard agree on a count above zero.
 *  - confirmed_zero: both show zero, and no lead in the window is missing its ID.
 *  - attribution_missing: leads exist that no unit carries (a missing or unlisted ID), so this unit's zero is not trusted.
 *  - source_mismatch: the two counts differ, and no unattributed lead explains it.
 *  - data_unavailable: a lead source did not load in full.
 *  - no_delivery: nothing was spent or shown in the window, so there is nothing to count.
 */
export type LeadDataState = "ok" | "confirmed_zero" | "attribution_missing" | "source_mismatch" | "data_unavailable" | "no_delivery";

export interface LeadDataFigures {
  leadsKnown: boolean;
  spend: number;
  impressions: number;
  /** The unit's dashboard leads, from every source. */
  leads: number;
  /** Meta's own lead count for the unit. */
  metaLeads: number;
}

export function leadDataStateOf(figures: LeadDataFigures, gaps: AttributionGaps | null): LeadDataState {
  if (!figures.leadsKnown) return "data_unavailable";
  if (figures.spend === 0 && figures.impressions === 0) return "no_delivery";
  if (figures.leads === figures.metaLeads) {
    if (figures.leads > 0) return "ok";
    // Both sources show zero. A lead with no ID could still belong to this unit, so the zero is not confirmed.
    return (gaps?.noIds ?? 0) > 0 ? "attribution_missing" : "confirmed_zero";
  }
  if (figures.leads < figures.metaLeads && (gaps?.unassigned ?? 0) > 0) return "attribution_missing";
  return "source_mismatch";
}

export const LEAD_DATA_STATE_LABELS: Record<LeadDataState, { en: string; he: string; tone: Tone }> = {
  ok: { en: "OK", he: "תקין", tone: "positive" },
  confirmed_zero: { en: "Confirmed Zero Leads", he: "אפס לידים מאושר", tone: "info" },
  attribution_missing: { en: "Attribution Missing", he: "שיוך חסר", tone: "watch" },
  source_mismatch: { en: "Source Mismatch", he: "פער מקורות", tone: "info" },
  data_unavailable: { en: "Data Unavailable", he: "נתונים לא זמינים", tone: "insufficient" },
  no_delivery: { en: "No delivery", he: "אין הוצאה או חשיפה", tone: "insufficient" },
};
