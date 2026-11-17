import type { SonilChecks } from "@/lib/optimization/sonil/checks";
import type { SonilComparisonRow } from "@/lib/optimization/sonil/compare";
import type { SonilMapping, ValueMap } from "@/lib/optimization/sonil/mapping";
import type { NormalizedSonilRow } from "@/lib/optimization/sonil/normalize";
import type { SonilFormat } from "@/lib/optimization/sonil/parse";
import type { ColumnProfile } from "@/lib/optimization/sonil/profile";

/** The shapes the Sonil API returns and the tab reads. Safe to import in the browser: types only. */

export interface SonilFileInfo {
  name: string;
  format: SonilFormat;
  sheetName: string | null;
  sheetCount: number;
  encoding: string | null;
  delimiter: string | null;
  rowCount: number;
  warnings: string[];
}

export interface SonilPreview {
  file: SonilFileInfo;
  columns: ColumnProfile[];
  /** The first rows, as text, so the person can see the file before mapping it. */
  sampleRows: string[][];
  /** Present only when a mapping was sent: the checks and the comparison are computed, and nothing is saved. */
  checks: SonilChecks | null;
  comparison: SonilComparisonRow[] | null;
}

export interface SonilImportSummary {
  importId: string;
  runId: string;
  createdAt: string;
  file: SonilFileInfo;
  mapping: SonilMapping;
  checks: SonilChecks;
}

/** What is stored for one import. The rows keep the file's own text, so the comparison can be read back exactly. */
export interface SonilImportRecord {
  summary: SonilImportSummary;
  valueMap: ValueMap;
  rows: NormalizedSonilRow[];
}

export interface SonilLatest {
  import: SonilImportSummary | null;
  comparison: SonilComparisonRow[];
}
