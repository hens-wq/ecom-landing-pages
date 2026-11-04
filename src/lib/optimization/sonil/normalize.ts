import type { ActionCode } from "@/lib/optimization/labels";
import type { Level } from "@/lib/optimization/model";
import { cellText, readDate, readId, readNumber } from "@/lib/optimization/sonil/cells";
import { normalizeRecommendationText, UNMAPPED, type SonilMapping, type ValueMap } from "@/lib/optimization/sonil/mapping";
import type { ParsedSonilFile, RawCell } from "@/lib/optimization/sonil/parse";

/** One row of the file, read through the mapping. Stored with the import, so the comparison can be read back exactly. */
export interface NormalizedSonilRow {
  /** The row number in the file. Row 1 is the header. */
  rowNumber: number;
  /** The most specific ID decides the level. Null when an ID cell is unusable or no ID was given. */
  level: Level | null;
  entityId: string | null;
  campaignId: string | null;
  adSetId: string | null;
  adId: string | null;
  /** Why the row cannot be matched by ID, in Hebrew. Null when the row can be matched. */
  idProblem: string | null;
  date: string | null;
  dateProblem: string | null;
  spend: number | null;
  spendProblem: string | null;
  leads: number | null;
  leadsProblem: string | null;
  /** The recommendation as Sonil wrote it. Null when the cell is blank. */
  recommendationText: string | null;
  /** The action the person mapped this text to. Null when it is unmapped or the cell is blank. */
  action: ActionCode | null;
}

export function normalizeSonilRows(file: ParsedSonilFile, mapping: SonilMapping, valueMap: ValueMap): NormalizedSonilRow[] {
  return file.rows.map((cells, index) => normalizeRow(cells, file.rowNumbers[index] ?? index + 2, mapping, valueMap));
}

function normalizeRow(cells: RawCell[], rowNumber: number, mapping: SonilMapping, valueMap: ValueMap): NormalizedSonilRow {
  const at = (column: number | null): RawCell | undefined => (column === null ? undefined : cells[column]);

  const campaign = readId(at(mapping.campaignId));
  const adSet = readId(at(mapping.adSetId));
  const ad = readId(at(mapping.adId));
  const idProblems = [
    campaign.problem ? `קמפיין: ${campaign.problem}` : null,
    adSet.problem ? `Ad Set: ${adSet.problem}` : null,
    ad.problem ? `מודעה: ${ad.problem}` : null,
  ].filter((problem): problem is string => problem !== null);

  // The most specific ID gives the level. If any ID cell is unusable, the row is not matched at all: a row with a broken ad ID
  // must not quietly match its campaign.
  const level: Level | null = ad.value ? "ad" : adSet.value ? "adset" : campaign.value ? "campaign" : null;
  const entityId = level === "ad" ? ad.value : level === "adset" ? adSet.value : level === "campaign" ? campaign.value : null;
  const idProblem =
    idProblems.length > 0 ? idProblems.join(" ") : level === null ? "אין מזהה בשורה, והשורה לא מותאמת. לא מתאימים לפי שם." : null;

  const date = readDate(at(mapping.date));
  const spend = readNumber(at(mapping.spend));
  const leads = readNumber(at(mapping.leads));
  const text = normalizeRecommendationText(cellText(at(mapping.recommendation)));
  const mapped = text ? valueMap[text] : undefined;

  return {
    rowNumber,
    level: idProblems.length > 0 ? null : level,
    entityId: idProblems.length > 0 ? null : entityId,
    campaignId: campaign.value,
    adSetId: adSet.value,
    adId: ad.value,
    idProblem,
    date: date.value,
    dateProblem: date.problem,
    spend: spend.value,
    spendProblem: spend.problem,
    leads: leads.value,
    leadsProblem: leads.problem,
    recommendationText: text || null,
    action: mapped && mapped !== UNMAPPED ? mapped : null,
  };
}
