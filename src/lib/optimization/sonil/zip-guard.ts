import { inflateRawSync } from "node:zlib";

import { SONIL_MAX_UNCOMPRESSED_BYTES, SONIL_MAX_ZIP_ENTRIES } from "@/lib/optimization/sonil/limits";

/**
 * Checks an XLSX before any spreadsheet reader opens it. An XLSX is a zip file, and a zip can be hostile in several ways:
 * a small file that expands into a very large one, a macro project, an embedded object, or an XML entity declaration that
 * expands in the parser. Every check here runs on the zip's own records, before parsing. Pure: no network, no writes.
 */

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const EOCD_MIN_SIZE = 22;
const MAX_COMMENT_SIZE = 0xffff;
const CENTRAL_HEADER_SIZE = 46;
const LOCAL_HEADER_SIZE = 30;
const METHOD_STORED = 0;
const METHOD_DEFLATE = 8;
/** The XML parts that are read as text, to refuse entity declarations and macro content types. */
const INSPECTED_PART = /^(\[Content_Types\]\.xml|xl\/workbook\.xml|xl\/sharedStrings\.xml|xl\/worksheets\/[^/]+\.xml)$/;
/** Parts that carry macros, controls or embedded objects. A Sonil report has none of them. */
const MACRO_PART = /(^|\/)(vbaProject\.bin|vbaData\.xml)$|^xl\/(macrosheets|activeX|embeddings)\//i;

const INVALID = "הקובץ אינו קובץ XLSX תקין.";
const MACRO_MESSAGE = "הקובץ מכיל מאקרו או רכיבים מוטמעים, ולכן לא נקרא. שמרו את הדוח מחדש כ-XLSX נקי, בלי מאקרו.";
const DTD_MESSAGE = "הקובץ מכיל הגדרות XML מסוג DOCTYPE או ENTITY, שאינן מותרות בדוח סוניל.";
const TOO_LARGE = "קובץ ה-XLSX מתפרש לנפח גדול מדי.";

export interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
}

/** The entries listed in the zip's central directory, or the reason the directory cannot be read. */
export function readZipEntries(
  bytes: Uint8Array,
  maxEntries: number = SONIL_MAX_ZIP_ENTRIES
): { entries: ZipEntry[] } | { problem: string } {
  if (bytes.byteLength < EOCD_MIN_SIZE) return { problem: INVALID };
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // The end-of-central-directory record is at the end of the file, before an optional comment of up to 64 KB.
  const earliest = Math.max(0, bytes.byteLength - EOCD_MIN_SIZE - MAX_COMMENT_SIZE);
  let eocd = -1;
  for (let offset = bytes.byteLength - EOCD_MIN_SIZE; offset >= earliest; offset -= 1) {
    if (view.getUint32(offset, true) === EOCD_SIGNATURE) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) return { problem: INVALID };

  const count = view.getUint16(eocd + 10, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  if (count === 0xffff || centralOffset === 0xffffffff) return { problem: "קובץ ה-XLSX בפורמט ZIP64 ולא נתמך." };
  if (count > maxEntries) return { problem: "קובץ ה-XLSX מכיל יותר מדי קבצים פנימיים." };

  const entries: ZipEntry[] = [];
  let cursor = centralOffset;
  for (let index = 0; index < count; index += 1) {
    if (cursor + CENTRAL_HEADER_SIZE > bytes.byteLength || view.getUint32(cursor, true) !== CENTRAL_SIGNATURE) {
      return { problem: INVALID };
    }
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const nameStart = cursor + CENTRAL_HEADER_SIZE;
    if (nameStart + nameLength > bytes.byteLength) return { problem: INVALID };
    entries.push({
      name: new TextDecoder("utf-8").decode(bytes.subarray(nameStart, nameStart + nameLength)),
      method: view.getUint16(cursor + 10, true),
      compressedSize: view.getUint32(cursor + 20, true),
      uncompressedSize: view.getUint32(cursor + 24, true),
      localOffset: view.getUint32(cursor + 42, true),
    });
    cursor = nameStart + nameLength + extraLength + commentLength;
  }
  return { entries };
}

/** The size and entry-count limits alone. Kept separate so each limit can be tested. */
export function checkZipLimits(
  bytes: Uint8Array,
  maxUncompressed: number = SONIL_MAX_UNCOMPRESSED_BYTES,
  maxEntries: number = SONIL_MAX_ZIP_ENTRIES
): string | null {
  const read = readZipEntries(bytes, maxEntries);
  if ("problem" in read) return read.problem;
  let total = 0;
  for (const entry of read.entries) {
    total += entry.uncompressedSize;
    if (total > maxUncompressed) return TOO_LARGE;
  }
  return null;
}

/** The text of one entry, read from its local record. Stored and deflated entries are supported; nothing else is. */
function readEntryText(bytes: Uint8Array, entry: ZipEntry): { text: string } | { problem: string } {
  if (entry.localOffset + LOCAL_HEADER_SIZE > bytes.byteLength) return { problem: INVALID };
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(entry.localOffset, true) !== LOCAL_SIGNATURE) return { problem: INVALID };
  const nameLength = view.getUint16(entry.localOffset + 26, true);
  const extraLength = view.getUint16(entry.localOffset + 28, true);
  const start = entry.localOffset + LOCAL_HEADER_SIZE + nameLength + extraLength;
  const end = start + entry.compressedSize;
  if (end > bytes.byteLength) return { problem: INVALID };
  const data = bytes.subarray(start, end);
  try {
    if (entry.method === METHOD_STORED) return { text: new TextDecoder("utf-8").decode(data) };
    if (entry.method === METHOD_DEFLATE) {
      // maxOutputLength stops a deflate bomb while it expands, not after.
      const inflated = inflateRawSync(data, { maxOutputLength: SONIL_MAX_UNCOMPRESSED_BYTES });
      return { text: new TextDecoder("utf-8").decode(inflated) };
    }
    return { problem: "הקובץ משתמש בשיטת דחיסה שאינה נתמכת." };
  } catch {
    return { problem: TOO_LARGE };
  }
}

/**
 * Everything the reader must not meet in a Sonil report: a size or entry count over the limit, a macro project, an embedded
 * object, a macro-enabled content type, or an XML document type declaration. Returns a Hebrew reason, or null when the file
 * is a plain workbook. Formulas are not evaluated anywhere: the reader keeps the value the file stores for each cell.
 */
export function checkXlsxSafety(bytes: Uint8Array): string | null {
  const limits = checkZipLimits(bytes);
  if (limits) return limits;
  const read = readZipEntries(bytes);
  if ("problem" in read) return read.problem;

  if (read.entries.some((entry) => MACRO_PART.test(entry.name))) return MACRO_MESSAGE;
  for (const entry of read.entries) {
    if (!INSPECTED_PART.test(entry.name)) continue;
    const content = readEntryText(bytes, entry);
    if ("problem" in content) return content.problem;
    if (/<!DOCTYPE|<!ENTITY/i.test(content.text)) return DTD_MESSAGE;
    if (entry.name === "[Content_Types].xml" && /macroEnabled/i.test(content.text)) return MACRO_MESSAGE;
  }
  return null;
}
