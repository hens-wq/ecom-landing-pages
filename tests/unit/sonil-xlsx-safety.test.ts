// The XLSX a person uploads is hostile until proven otherwise. These tests build small files that carry each danger and
// check that they are refused before any spreadsheet reader opens them. Synthetic files only.
import assert from "node:assert/strict";
import { test } from "node:test";

import { emptyMapping } from "@/lib/optimization/sonil/mapping";
import { normalizeSonilRows } from "@/lib/optimization/sonil/normalize";
import { parseSonilFile, SonilFileError } from "@/lib/optimization/sonil/parse";
import { checkXlsxSafety } from "@/lib/optimization/sonil/zip-guard";
import { buildXlsx, sheetXml } from "./zip-fixtures";

const MAPPING = { ...emptyMapping(), adId: 0, spend: 1, recommendation: 2 };
const HEADER = ["ad_id", "spend", "recommendation"];

test("a plain workbook passes the safety check and parses, with its cell values kept", async () => {
  const bytes = buildXlsx(sheetXml([HEADER, ["9001", 3500, "לשמור"]]));
  assert.equal(checkXlsxSafety(bytes), null);
  const file = await parseSonilFile(bytes, "xlsx");
  assert.deepEqual(file.headers, HEADER);
  assert.equal(file.rows[0][0], "9001", "a text cell is kept as text");
  assert.deepEqual(file.rows[0][1], { raw: "3500" }, "a number is kept as the text Excel wrote");
});

test("a workbook that carries a macro project is refused, even when its sheet is clean", async () => {
  const bytes = buildXlsx(sheetXml([HEADER, ["9001", 1, "לשמור"]]), {
    extra: [{ name: "xl/vbaProject.bin", text: "not really a macro project" }],
  });
  assert.match(checkXlsxSafety(bytes) ?? "", /מאקרו/);
  await assert.rejects(parseSonilFile(bytes, "xlsx"), SonilFileError);
});

test("a workbook declared as macro-enabled is refused", () => {
  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.ms-excel.sheet.macroEnabled.main+xml"/>' +
    "</Types>";
  const bytes = buildXlsx(sheetXml([HEADER, ["9001", 1, "לשמור"]]), { contentTypes });
  assert.match(checkXlsxSafety(bytes) ?? "", /מאקרו/);
});

test("an XML document type declaration with entities is refused before it can expand", async () => {
  const sheet =
    '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE worksheet [<!ENTITY lol "lol">]>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData/></worksheet>';
  const bytes = buildXlsx(sheet);
  assert.match(checkXlsxSafety(bytes) ?? "", /DOCTYPE/);
  await assert.rejects(parseSonilFile(bytes, "xlsx"), SonilFileError);
});

test("a deflated sheet is inflated for the check and parses like a stored one", async () => {
  const bytes = buildXlsx(sheetXml([HEADER, ["9001", 1, "לשמור"]]), { sheetDeflated: true });
  assert.equal(checkXlsxSafety(bytes), null);
  const file = await parseSonilFile(bytes, "xlsx");
  assert.equal(file.rows[0][0], "9001");
});

test("a deflate bomb that declares a small size is stopped while it expands, not after", () => {
  // 30 MB of text compresses to a few kilobytes, but the entry claims to be 1 KB. The declared size must not be trusted.
  const huge = `<x>${"a".repeat(30 * 1024 * 1024)}</x>`;
  const bytes = buildXlsx(huge, { sheetDeflated: true, sheetDeclaredSize: 1024 });
  assert.match(checkXlsxSafety(bytes) ?? "", /נפח גדול מדי/);
});

test("a formula keeps the value the file stores for it, and no formula is ever evaluated", async () => {
  const bytes = buildXlsx(
    sheetXml([
      HEADER,
      ["9001", { formula: "1+1", cached: 2 }, "לשמור"],
      ["9002", { formula: "SUM(1,2)" }, "לשמור"],
    ])
  );
  assert.equal(checkXlsxSafety(bytes), null, "a formula is allowed; it is just not run");
  const file = await parseSonilFile(bytes, "xlsx");
  assert.deepEqual(file.rows[0][1], { raw: "2" }, "the stored value is used");
  assert.notDeepEqual(file.rows[1][1], { raw: "3" }, "a formula without a stored value is not computed");

  const [first, second] = normalizeSonilRows(file, MAPPING, { לשמור: "KEEP" });
  assert.equal(first.spend, 2);
  assert.notEqual(second.spend, 3, "SUM(1,2) is never evaluated");
});

test("a CSV cell that starts with an equals sign is text, and is never evaluated", async () => {
  const bytes = Buffer.from("ad_id,spend,recommendation\n9001,=1+1,לשמור\n", "utf8");
  const file = await parseSonilFile(bytes, "csv");
  assert.equal(file.rows[0][1], "=1+1");
  const [row] = normalizeSonilRows(file, MAPPING, { לשמור: "KEEP" });
  assert.equal(row.spend, null, "=1+1 is not a number, so it is not computed");
  assert.match(row.spendProblem ?? "", /אינו מספר/);
});
