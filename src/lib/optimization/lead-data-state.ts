import type { Tone } from "@/lib/optimization/labels";
import type { AttributionGaps } from "@/lib/performance/attribution";

/**
 * The state of one unit's lead data, read from its own figures and the window's attribution gaps. It describes the data
 * only: it never changes a rule's threshold. It is shown next to every unit's leads, so a zero never appears without its reason.
 *  - ok: Meta and the dashboard agree on a count above zero.
 *  - confirmed_zero: both show zero, and no lead of the window with no ID at all could belong to this unit.
 *  - attribution_missing: the unit's own count is short, or it is zero, and window leads that carry no unit could belong to it.
 *  - source_mismatch: the two counts differ, and no unplaced lead of the window could explain it. The cause is not verified.
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

/**
 * Whether the window's unplaced leads could belong to one unit. The scope is per unit, so one unit's gap never blocks
 * another unit that agrees with Meta:
 *  - the dashboard shows fewer leads than Meta: any unplaced lead of the window could be the missing one;
 *  - both show zero: only a lead with no ID at all could belong to this unit, since it carries no ID to rule it out.
 */
export function gapAffects(figures: Pick<LeadDataFigures, "leads" | "metaLeads">, gaps: AttributionGaps | null): boolean {
  if (!gaps) return false;
  if (figures.leads < figures.metaLeads) return gaps.unassigned > 0;
  if (figures.leads === 0 && figures.metaLeads === 0) return gaps.noIds > 0;
  return false;
}

export function leadDataStateOf(figures: LeadDataFigures, gaps: AttributionGaps | null): LeadDataState {
  if (!figures.leadsKnown) return "data_unavailable";
  if (figures.spend === 0 && figures.impressions === 0) return "no_delivery";
  if (figures.leads === figures.metaLeads) {
    if (figures.leads > 0) return "ok";
    return gapAffects(figures, gaps) ? "attribution_missing" : "confirmed_zero";
  }
  if (figures.leads < figures.metaLeads && gapAffects(figures, gaps)) return "attribution_missing";
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
