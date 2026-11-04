import { SONIL_MAX_UNCOMPRESSED_BYTES, SONIL_MAX_ZIP_ENTRIES } from "@/lib/optimization/sonil/limits";

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const EOCD_MIN_SIZE = 22;
const MAX_COMMENT_SIZE = 0xffff;
const CENTRAL_HEADER_SIZE = 46;

/**
 * Checks an XLSX (a zip file) before any parser opens it. The sizes and the entry count declared in the zip's central
 * directory must stay within the limits. A small file can otherwise expand into a very large one. Returns a Hebrew reason,
 * or null when the file passes.
 */
export function checkZipLimits(
  bytes: Uint8Array,
  maxUncompressed: number = SONIL_MAX_UNCOMPRESSED_BYTES,
  maxEntries: number = SONIL_MAX_ZIP_ENTRIES
): string | null {
  const invalid = "הקובץ אינו קובץ XLSX תקין.";
  if (bytes.byteLength < EOCD_MIN_SIZE) return invalid;

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
  if (eocd < 0) return invalid;

  const entries = view.getUint16(eocd + 10, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  if (entries === 0xffff || centralOffset === 0xffffffff) return "קובץ ה-XLSX בפורמט ZIP64 ולא נתמך.";
  if (entries > maxEntries) return "קובץ ה-XLSX מכיל יותר מדי קבצים פנימיים.";

  let total = 0;
  let cursor = centralOffset;
  for (let index = 0; index < entries; index += 1) {
    if (cursor + CENTRAL_HEADER_SIZE > bytes.byteLength || view.getUint32(cursor, true) !== CENTRAL_SIGNATURE) return invalid;
    total += view.getUint32(cursor + 24, true);
    if (total > maxUncompressed) return "קובץ ה-XLSX מתפרש לנפח גדול מדי.";
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    cursor += CENTRAL_HEADER_SIZE + nameLength + extraLength + commentLength;
  }
  return null;
}
