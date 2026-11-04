// Builds small XLSX and zip files for the safety tests. Synthetic content only. Nothing here is a real report.
import { deflateRawSync } from "node:zlib";

export interface ZipPart {
  name: string;
  text: string;
  /** Store the part deflated instead of plain. */
  deflate?: boolean;
  /** Declare a different uncompressed size than the data has, to test that the reader does not trust the declaration. */
  declaredSize?: number;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Buffer): number {
  let c = 0xffffffff;
  for (const byte of data) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function buildZip(parts: ZipPart[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const part of parts) {
    const name = Buffer.from(part.name, "utf8");
    const raw = Buffer.from(part.text, "utf8");
    const data = part.deflate ? deflateRawSync(raw) : raw;
    const method = part.deflate ? 8 : 0;
    const crc = crc32(raw);
    const declared = part.declaredSize ?? raw.length;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(0x21, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(declared, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(declared, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += local.length + name.length + data.length;
  }
  const centralBytes = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(parts.length, 8);
  end.writeUInt16LE(parts.length, 10);
  end.writeUInt32LE(centralBytes.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBytes, end]);
}

const CONTENT_TYPES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  "</Types>";

const ROOT_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  "</Relationships>";

const WORKBOOK =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
  '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>';

const WORKBOOK_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
  "</Relationships>";

/** A cell: plain text, a number, or a formula with the value the file stores for it (cached), when it has one. */
export type FixtureCell = string | number | { formula: string; cached?: number | string };

const COLUMNS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function sheetXml(rows: FixtureCell[][], prefix = ""): string {
  const body = rows
    .map((cells, rowIndex) => {
      const cellXml = cells
        .map((cell, columnIndex) => {
          const ref = `${COLUMNS[columnIndex]}${rowIndex + 1}`;
          if (typeof cell === "number") return `<c r="${ref}"><v>${cell}</v></c>`;
          if (typeof cell === "string") return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`;
          const cached =
            cell.cached === undefined
              ? ""
              : typeof cell.cached === "number"
                ? `<v>${cell.cached}</v>`
                : `<v>${escapeXml(cell.cached)}</v>`;
          const type = typeof cell.cached === "string" ? ' t="str"' : "";
          return `<c r="${ref}"${type}><f>${escapeXml(cell.formula)}</f>${cached}</c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cellXml}</row>`;
    })
    .join("");
  return `${prefix}<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

/** A minimal, valid workbook with one sheet. `extra` adds parts, and `overrides` replaces the standard ones. */
export function buildXlsx(
  sheet: string,
  options: { extra?: ZipPart[]; contentTypes?: string; sheetDeflated?: boolean; sheetDeclaredSize?: number } = {}
): Buffer {
  return buildZip([
    { name: "[Content_Types].xml", text: options.contentTypes ?? CONTENT_TYPES },
    { name: "_rels/.rels", text: ROOT_RELS },
    { name: "xl/workbook.xml", text: WORKBOOK },
    { name: "xl/_rels/workbook.xml.rels", text: WORKBOOK_RELS },
    {
      name: "xl/worksheets/sheet1.xml",
      text: sheet,
      deflate: options.sheetDeflated,
      declaredSize: options.sheetDeclaredSize,
    },
    ...(options.extra ?? []),
  ]);
}
