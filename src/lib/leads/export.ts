import { formatDateTimeInTimezone } from "@/lib/advertising/timezone";
import { LEAD_SOURCE_LABELS } from "@/lib/constants";
import type { MetaFormLead } from "@/lib/leads/types";
import type { LeadStatusRecord } from "@/lib/lead-status/types";

/**
 * The exact 10-column contract Sunil's Optimization Agent expects - column
 * order matters (the agent reads by position), so this array IS the order,
 * never re-derived or re-sorted anywhere else.
 */
export interface LeadExportRow {
  leadDate: string;
  leadIdentifier: string;
  campaignId: string;
  campaignName: string;
  adSetId: string;
  adSetName: string;
  adId: string;
  adName: string;
  leadSource: string;
  outcome: string;
}

export const LEAD_EXPORT_COLUMNS: { key: keyof LeadExportRow; header: string }[] = [
  { key: "leadDate", header: "Lead Date" },
  { key: "leadIdentifier", header: "Lead Identifier" },
  { key: "campaignId", header: "Campaign ID" },
  { key: "campaignName", header: "Campaign Name" },
  { key: "adSetId", header: "Ad Set ID" },
  { key: "adSetName", header: "Ad Set Name" },
  { key: "adId", header: "Ad ID" },
  { key: "adName", header: "Ad Name" },
  { key: "leadSource", header: "Lead Source" },
  { key: "outcome", header: "Outcome" },
];

/**
 * Lead Identifier = Meta Lead ID (Sunil's confirmed mapping) - blank for a
 * Landing Page lead, which has no Meta Lead ID at all. Never invent one.
 *
 * Lead Date is formatted in Asia/Jerusalem ("YYYY-MM-DD HH:mm:ss"), matching
 * the timezone the 7-day export window itself is already computed in - a
 * raw UTC ISO timestamp here would silently disagree with that window by a
 * couple of hours right around midnight.
 *
 * Outcome = Secondary Status, but ONLY once a status has actually been
 * saved for this lead - a lead nobody has touched yet has no row in
 * lead_status at all (the on-screen column instead shows "חדש", the
 * hierarchy's default selection, since that's what the dropdown itself
 * shows - see components/leads/lead-row.tsx). For the export specifically,
 * "not yet given a Secondary Status" must stay blank, not filled in with
 * that same default, and never with Main Status.
 */
export function toLeadExportRow(lead: MetaFormLead, status: LeadStatusRecord | undefined): LeadExportRow {
  return {
    leadDate: formatDateTimeInTimezone(new Date(lead.createdTime)),
    leadIdentifier: lead.sourceType === "landing_page" ? "" : lead.id,
    campaignId: lead.campaignId || "",
    campaignName: lead.campaignName || "",
    adSetId: lead.adSetId || "",
    adSetName: lead.adSetName || "",
    adId: lead.adId || "",
    adName: lead.adName || "",
    leadSource: LEAD_SOURCE_LABELS[lead.sourceType].short,
    outcome: status?.secondaryStatus ?? "",
  };
}

/**
 * Standard CSV quoting only (RFC 4126: quote when the value contains a
 * comma/quote/newline, doubling any internal quotes) - no Excel formula
 * escape, no leading apostrophe, no other transformation. This export is
 * for Sunil's Optimization Agent, a machine parser, not for opening in
 * Excel by hand - a parsed field must equal the original value exactly,
 * Meta IDs included.
 */
function csvField(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** CRLF line endings, standard for a CSV. The caller (app/leads/page.tsx) prepends a UTF-8 BOM when turning this into a downloadable file, so a viewer that does open it detects the encoding correctly instead of mangling the Hebrew Lead Source values - not done here so this stays a plain, environment-agnostic string builder. */
export function buildLeadExportCsv(rows: LeadExportRow[]): string {
  const header = LEAD_EXPORT_COLUMNS.map((c) => csvField(c.header)).join(",");
  const lines = rows.map((row) => LEAD_EXPORT_COLUMNS.map((c) => csvField(row[c.key])).join(","));
  return [header, ...lines].join("\r\n");
}
