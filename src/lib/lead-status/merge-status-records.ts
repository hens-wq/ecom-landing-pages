import type { LeadStatusRecord } from "@/lib/lead-status/types";

/**
 * Both maps contain server-confirmed records. A refreshed record wins unless
 * a local save is provably newer, including a save completed during the fetch.
 * Unknown timestamps prefer incoming data; an absent incoming record preserves
 * a previous confirmed save without treating that absence as a deletion.
 */
export function mergeStatusRecords(
  incoming: ReadonlyMap<string, LeadStatusRecord>,
  confirmedSaves: ReadonlyMap<string, LeadStatusRecord>,
): Map<string, LeadStatusRecord> {
  const merged = new Map(incoming);
  for (const [leadId, saved] of confirmedSaves) {
    const refreshed = incoming.get(leadId);
    if (!refreshed) {
      merged.set(leadId, saved);
      continue;
    }
    const savedAt = Date.parse(saved.updatedAt);
    const refreshedAt = Date.parse(refreshed.updatedAt);
    if (Number.isFinite(savedAt) && Number.isFinite(refreshedAt) && savedAt > refreshedAt) {
      merged.set(leadId, saved);
    }
  }
  return merged;
}
