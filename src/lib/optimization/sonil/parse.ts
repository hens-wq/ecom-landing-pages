import readXlsxFile from "read-excel-file/node";

import { cellText, isBlank } from "@/lib/optimization/sonil/cells";
import { SONIL_MAX_COLUMNS, SONIL_MAX_ROWS } from "@/lib/optimization/sonil/limits";
import { checkZipLimits } from "@/lib/optimization/sonil/zip-guard";

/**
 * Reads a Sonil report from an XLSX or a CSV file. Pure: no network and no writes. Every cell comes back as it was stored,
 * so the cell readers in cells.ts decide what it means.
 */

/** A numeric cell of an XLSX, kept as the text Excel wrote. The text is what tells a long ID apart from a number. */
export interface NumericToken {
  raw: string;
}

export type RawCell = string | NumericToken | boolean | Date | null;

export type SonilFormat = "xlsx" | "csv";

/** A problem with the uploaded file itself. Its message is Hebrew and safe to show to the person who uploaded it. */
export class SonilFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SonilFileError";
  }
}

export interface ParsedSonilFile {
  format: SonilFormat;
  sheetName: string | null;
  sheetCount: number;
  encoding: "utf-8" | "windows-1255" | null;
  delimiter: "," | ";" | "\t" | null;
  /** One name per column. A blank header gets a name by its position, and a repeated name gets a number. */
  headers: string[];
  /** The data rows, without the header. Each row has one cell per header. */
  rows: RawCell[][];
  /** The sheet row number of each data row. Row 1 is the header row. Blank rows still count in the numbering. */
  rowNumbers: number[];
  warnings: string[];
}

/** The format, from the file name's extension. Null when the extension is neither XLSX nor CSV. */
export function formatOf(fileName: string): SonilFormat | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".xlsx")) return "xlsx";
  if (lower.endsWith(".csv")) return "csv";
  return null;
}

export async function parseSonilFile(bytes: Uint8Array, format: SonilFormat): Promise<ParsedSonilFile> {
  if (bytes.byteLength === 0) throw new SonilFileError("הקובץ ריק.");
  return format === "xlsx" ? parseXlsx(bytes) : parseCsv(bytes);
}

interface GridInput {
  sheetName: string | null;
  sheetCount: number;
  encoding: "utf-8" | "windows-1255" | null;
  delimiter: "," | ";" | "\t" | null;
  grid: RawCell[][];
  warnings: string[];
}

async function parseXlsx(bytes: Uint8Array): Promise<ParsedSonilFile> {
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  if (!isZip) throw new SonilFileError("הקובץ אינו XLSX תקין. שמרו אותו מחדש כ-XLSX או ייצאו אותו כ-CSV.");
  const problem = checkZipLimits(bytes);
  if (problem) throw new SonilFileError(problem);

  let sheets: Array<{ sheet: string; data: RawCell[][] }>;
  try {
    // Numbers are read as their raw text (see NumericToken). Dates come back as Date objects in UTC.
    const read = await readXlsxFile<NumericToken>(Buffer.from(bytes), { parseNumber: (raw: string): NumericToken => ({ raw }) });
    sheets = read as unknown as Array<{ sheet: string; data: RawCell[][] }>;
  } catch {
    throw new SonilFileError("לא ניתן לקרוא את קובץ ה-XLSX. בדקו שהקובץ לא פגום ושאינו מוגן בסיסמה.");
  }
  if (sheets.length === 0) throw new SonilFileError("הקובץ לא מכיל גיליונות.");

  const first = sheets[0];
  const warnings =
    sheets.length > 1 ? [`הקובץ מכיל ${sheets.length} גיליונות. נקרא הגיליון הראשון בלבד: "${first.sheet}".`] : [];
  return buildParsed("xlsx", { sheetName: first.sheet, sheetCount: sheets.length, encoding: null, delimiter: null, grid: first.data, warnings });
}

function parseCsv(bytes: Uint8Array): ParsedSonilFile {
  const { text, encoding } = decodeCsv(bytes);
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const delimiter = detectDelimiter(body);
  const grid = splitDelimited(body, delimiter);
  return buildParsed("csv", { sheetName: null, sheetCount: 1, encoding, delimiter, grid, warnings: [] });
}

/** UTF-8 when the bytes are valid UTF-8. Otherwise Windows-1255, which is what Hebrew Excel writes for a CSV on Windows. */
function decodeCsv(bytes: Uint8Array): { text: string; encoding: "utf-8" | "windows-1255" } {
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), encoding: "utf-8" };
  } catch {
    return { text: new TextDecoder("windows-1255").decode(bytes), encoding: "windows-1255" };
  }
}

/** The delimiter that appears most often in the first line. A tie, or no delimiter at all, keeps the comma. */
function detectDelimiter(text: string): "," | ";" | "\t" {
  const firstLine = text.split(/\r\n|\r|\n/, 1)[0] ?? "";
  const candidates: Array<"," | ";" | "\t"> = [",", ";", "\t"];
  let best: "," | ";" | "\t" = ",";
  let bestCount = 0;
  for (const candidate of candidates) {
    const count = firstLine.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

/** RFC 4180 style: quoted fields may hold the delimiter, a line break, or a doubled quote. */
function splitDelimited(text: string, delimiter: string): RawCell[][] {
  const rows: RawCell[][] = [];
  let row: RawCell[] = [];
  let field = "";
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      if (rows.length > SONIL_MAX_ROWS + 1) throw new SonilFileError(`הקובץ מכיל יותר מ-${SONIL_MAX_ROWS} שורות נתונים.`);
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function buildParsed(format: SonilFormat, input: GridInput): ParsedSonilFile {
  // A row blank in every cell is skipped, as a person skips it when reading the sheet. Its number still counts.
  const numbered = input.grid
    .map((cells, index) => ({ cells, rowNumber: index + 1 }))
    .filter((row) => row.cells.some((cell) => !isBlank(cell)));
  const [headerRow, ...dataRows] = numbered;
  if (!headerRow) throw new SonilFileError("הקובץ ריק: לא נמצאה שורת כותרות.");

  const columnCount = dataRows.reduce((most, row) => Math.max(most, row.cells.length), headerRow.cells.length);
  if (columnCount > SONIL_MAX_COLUMNS) throw new SonilFileError(`הקובץ מכיל יותר מ-${SONIL_MAX_COLUMNS} עמודות.`);
  if (dataRows.length > SONIL_MAX_ROWS) throw new SonilFileError(`הקובץ מכיל יותר מ-${SONIL_MAX_ROWS} שורות נתונים.`);

  const seen = new Map<string, number>();
  const headers = Array.from({ length: columnCount }, (_, index) => {
    const base = cellText(headerRow.cells[index]) || `עמודה ${index + 1}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base} (${count})`;
  });

  return {
    format,
    sheetName: input.sheetName,
    sheetCount: input.sheetCount,
    encoding: input.encoding,
    delimiter: input.delimiter,
    headers,
    rows: dataRows.map((row) => Array.from({ length: columnCount }, (_, index) => row.cells[index] ?? null)),
    rowNumbers: dataRows.map((row) => row.rowNumber),
    warnings: input.warnings,
  };
}
