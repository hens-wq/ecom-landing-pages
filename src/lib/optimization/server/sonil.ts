import "server-only";

import { randomUUID } from "node:crypto";

import { cellText } from "@/lib/optimization/sonil/cells";
import { checkSonilRows, type SonilChecks } from "@/lib/optimization/sonil/checks";
import { compareWithOwnRecommendations, type SonilComparisonRow } from "@/lib/optimization/sonil/compare";
import { mappingProblems, parseMapping, parseValueMap, type SonilMapping, type ValueMap } from "@/lib/optimization/sonil/mapping";
import { normalizeSonilRows, type NormalizedSonilRow } from "@/lib/optimization/sonil/normalize";
import { SONIL_MAX_FILE_BYTES, SONIL_SAMPLE_ROWS } from "@/lib/optimization/sonil/limits";
import { formatOf, parseSonilFile, SonilFileError, type ParsedSonilFile, type SonilFormat } from "@/lib/optimization/sonil/parse";
import { profileColumns, type ColumnProfile } from "@/lib/optimization/sonil/profile";
import type { SonilFileInfo, SonilImportSummary, SonilLatest, SonilPreview } from "@/lib/optimization/sonil/types";
import type { RunRecord } from "@/lib/optimization/run";
import { getOptimizationRepository } from "@/lib/optimization/server/repository";

/**
 * The Sonil comparison, on the server. A file is read, checked against the saved run and compared with our recommendations.
 * Reading and checking change nothing. Saving stores the file's rows next to the run; it never touches the run itself.
 */

/** A little above the file limit, for the form's own fields. A larger request is refused before it is read. */
const FORM_OVERHEAD_BYTES = 64 * 1024;
const MAX_NAME_LENGTH = 120;

interface Upload {
  name: string;
  format: SonilFormat;
  bytes: Uint8Array;
  parsed: ParsedSonilFile;
  mapping: SonilMapping | null;
  valueMap: ValueMap | null;
}

function sanitizeName(name: string): string {
  return name.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, MAX_NAME_LENGTH) || "sonil";
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/** Reads the form: the file, and the mapping and value map when the person has sent them. */
async function readUpload(request: Request): Promise<Upload> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > SONIL_MAX_FILE_BYTES + FORM_OVERHEAD_BYTES) {
    throw new SonilFileError(`הקובץ גדול מ-${Math.round(SONIL_MAX_FILE_BYTES / (1024 * 1024))} MB. ייצאו רק את השורות והעמודות הנדרשות.`);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new SonilFileError("הבקשה אינה טופס קובץ תקין.");
  }

  const value = form.get("file");
  if (!(value instanceof Blob)) throw new SonilFileError("לא נשלח קובץ.");
  const name = sanitizeName(value instanceof File ? value.name : "sonil");
  const format = formatOf(name);
  if (!format) throw new SonilFileError("סוג הקובץ לא נתמך. יש להעלות קובץ XLSX או CSV בלבד.");
  if (value.size > SONIL_MAX_FILE_BYTES) {
    throw new SonilFileError(`הקובץ גדול מ-${Math.round(SONIL_MAX_FILE_BYTES / (1024 * 1024))} MB. ייצאו רק את השורות והעמודות הנדרשות.`);
  }

  const bytes = new Uint8Array(await value.arrayBuffer());
  const parsed = await parseSonilFile(bytes, format);

  const mappingText = form.get("mapping");
  let mapping: SonilMapping | null = null;
  let valueMap: ValueMap | null = null;
  if (typeof mappingText === "string" && mappingText.trim() !== "") {
    mapping = parseMapping(parseJson(mappingText));
    if (!mapping) throw new SonilFileError("המיפוי שנשלח אינו תקין.");
    const valueText = form.get("valueMap");
    valueMap = typeof valueText === "string" && valueText.trim() !== "" ? parseValueMap(parseJson(valueText)) : {};
    if (!valueMap) throw new SonilFileError("מיפוי ערכי ההמלצה שנשלח אינו תקין.");
  }
  return { name, format, bytes, parsed, mapping, valueMap };
}

function fileInfo(upload: Upload): SonilFileInfo {
  return {
    name: upload.name,
    format: upload.format,
    sheetName: upload.parsed.sheetName,
    sheetCount: upload.parsed.sheetCount,
    encoding: upload.parsed.encoding,
    delimiter: upload.parsed.delimiter,
    rowCount: upload.parsed.rows.length,
    warnings: upload.parsed.warnings,
  };
}

interface Analysis {
  rows: NormalizedSonilRow[];
  checks: SonilChecks;
  comparison: SonilComparisonRow[];
}

function analyze(run: RunRecord, parsed: ParsedSonilFile, mapping: SonilMapping, valueMap: ValueMap): Analysis {
  const rows = normalizeSonilRows(parsed, mapping, valueMap);
  return { rows, checks: checkSonilRows(run, rows, mapping), comparison: compareWithOwnRecommendations(run, rows) };
}

function requireUsableMapping(mapping: SonilMapping, columnCount: number): void {
  const problems = mappingProblems(mapping, columnCount);
  if (problems.length > 0) throw new SonilFileError(problems.join(" "));
}

/** The first rows of the file as text, and the hints for each column. Nothing here is saved. */
function sampleOf(parsed: ParsedSonilFile): { columns: ColumnProfile[]; sampleRows: string[][] } {
  return {
    columns: profileColumns(parsed),
    sampleRows: parsed.rows.slice(0, SONIL_SAMPLE_ROWS).map((row) => row.map((cell) => cellText(cell))),
  };
}

/** Reads the file for the preview. With a mapping, it also runs the checks and the comparison, and saves nothing. */
export async function previewSonil(runId: string, request: Request): Promise<SonilPreview | "not_found"> {
  const run = await getOptimizationRepository().getRun(runId);
  if (!run) return "not_found";

  const upload = await readUpload(request);
  const { columns, sampleRows } = sampleOf(upload.parsed);
  if (!upload.mapping || !upload.valueMap) {
    return { file: fileInfo(upload), columns, sampleRows, checks: null, comparison: null };
  }
  requireUsableMapping(upload.mapping, upload.parsed.headers.length);
  const analysis = analyze(run, upload.parsed, upload.mapping, upload.valueMap);
  return { file: fileInfo(upload), columns, sampleRows, checks: analysis.checks, comparison: analysis.comparison };
}

/** Saves the file's rows against the run, once the person has confirmed the mapping. Our analysis is not changed. */
export async function saveSonil(runId: string, request: Request): Promise<{ import: SonilImportSummary; comparison: SonilComparisonRow[] } | "not_found"> {
  const repository = getOptimizationRepository();
  const run = await repository.getRun(runId);
  if (!run) return "not_found";

  const upload = await readUpload(request);
  if (!upload.mapping || !upload.valueMap) throw new SonilFileError("לפני השמירה יש לשלוח את המיפוי של העמודות ושל ערכי ההמלצה.");
  requireUsableMapping(upload.mapping, upload.parsed.headers.length);

  const analysis = analyze(run, upload.parsed, upload.mapping, upload.valueMap);
  const summary: SonilImportSummary = {
    importId: randomUUID(),
    runId,
    createdAt: new Date().toISOString(),
    file: fileInfo(upload),
    mapping: upload.mapping,
    checks: analysis.checks,
  };
  await repository.saveSonilImport({ summary, valueMap: upload.valueMap, rows: analysis.rows });
  return { import: summary, comparison: analysis.comparison };
}

/** The latest saved Sonil report for a run, compared with the run as it was saved. Reading changes nothing. */
export async function latestSonil(runId: string): Promise<SonilLatest | "not_found"> {
  const repository = getOptimizationRepository();
  const run = await repository.getRun(runId);
  if (!run) return "not_found";
  const saved = await repository.latestSonilImport(runId);
  if (!saved) return { import: null, comparison: [] };
  return { import: saved.summary, comparison: compareWithOwnRecommendations(run, saved.rows) };
}
