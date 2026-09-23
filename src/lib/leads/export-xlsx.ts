import "server-only";

import writeXlsxFile, { type SheetData } from "write-excel-file/node";

import { LEAD_EXPORT_COLUMNS, type LeadExportRow } from "@/lib/leads/export";

/**
 * Columns whose value is a Meta/internal ID - forced to genuine XLSX text
 * cell type (`type: String`, native OOXML `t="s"`) rather than relying on
 * value-based type inference, so a large numeric-looking Meta ID can never
 * be stored as a number and silently rounded or rendered in scientific
 * notation by Excel. No formula trick (`="..."`) involved - unlike CSV, XLSX
 * has real cell-type metadata to do this natively.
 */
const TEXT_FORCED_KEYS = new Set<keyof LeadExportRow>(["leadIdentifier", "campaignId", "adSetId", "adId"]);

/** One sheet named "Leads", header row + one row per lead, same 10-column contract as the CSV export (lib/leads/export.ts) - only the serialization differs. */
export async function buildLeadExportXlsxBuffer(rows: LeadExportRow[]): Promise<Buffer> {
  const headerRow: SheetData[number] = LEAD_EXPORT_COLUMNS.map((column) => column.header);
  const dataRows: SheetData = rows.map((row) =>
    LEAD_EXPORT_COLUMNS.map((column) => {
      const value = row[column.key];
      return TEXT_FORCED_KEYS.has(column.key) ? { value, type: String } : value;
    })
  );
  const sheetData: SheetData = [headerRow, ...dataRows];
  return writeXlsxFile(sheetData, { sheet: "Leads" }).toBuffer();
}

/**
 * `ecom-leads-{since}.xlsx` when the range is a single day (Today, Yesterday,
 * ...), `ecom-leads-{since}-to-{until}.xlsx` otherwise - always derived from
 * the actual selected range, never a fixed/hidden window.
 */
export function buildLeadExportXlsxFilename(since: string, until: string): string {
  return since === until ? `ecom-leads-${since}.xlsx` : `ecom-leads-${since}-to-${until}.xlsx`;
}
