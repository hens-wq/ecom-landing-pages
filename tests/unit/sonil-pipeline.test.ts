// The Sonil comparison pipeline: reading the file, the mapping, matching by ID, the checks against the run, and the
// comparison with our own recommendation. Synthetic data only. The IDs are digits, as Meta's are.
import assert from "node:assert/strict";
import { test } from "node:test";

import writeXlsxFile from "write-excel-file/node";

import { evaluateOptimization } from "@/lib/optimization/engine";
import type { EntityInput } from "@/lib/optimization/model";
import type { RunRecord } from "@/lib/optimization/run";
import { checkSonilRows } from "@/lib/optimization/sonil/checks";
import { compareWithOwnRecommendations } from "@/lib/optimization/sonil/compare";
import { cellText, readDate, readId, readNumber } from "@/lib/optimization/sonil/cells";
import { emptyMapping, mappingProblems, parseMapping, parseValueMap, type SonilMapping, type ValueMap } from "@/lib/optimization/sonil/mapping";
import { normalizeSonilRows } from "@/lib/optimization/sonil/normalize";
import { parseSonilFile, SonilFileError } from "@/lib/optimization/sonil/parse";
import { profileColumns } from "@/lib/optimization/sonil/profile";
import { checkZipLimits } from "@/lib/optimization/sonil/zip-guard";
import { ad, engineInput, fig } from "./optimization-fixtures";

const RANGE = { since: "2026-10-27", until: "2026-11-02" };
const CAMPAIGN = "5001";
const ADSET = "7001";
const HEADER = "ad_id,adset_id,campaign_id,date,spend,leads,recommendation";
const MAPPING: SonilMapping = { ...emptyMapping(), adId: 0, adSetId: 1, campaignId: 2, date: 3, spend: 4, leads: 5, recommendation: 6 };
const VALUES: ValueMap = { לשמור: "KEEP", לעצור: "PAUSE_CANDIDATE", לבדוק: "TEST" };

const BAD = fig({ spend: 3500, impressions: 25_000, reach: 12_000, leads: 10, metaLeads: 10, metaFormLeads: 10, green: 8, red: 2, pending: 0, sales: 1, revenue: 1000 });

function entitiesFor(): EntityInput[] {
  const base = { campaignId: CAMPAIGN, parentId: ADSET };
  return [
    ad("9002", { ...base, selected: fig() }),
    ad("9001", { ...base, selected: BAD }),
    ad("9003", { ...base, selected: fig({ leadsKnown: false, leads: 0, metaLeads: 0, metaFormLeads: 0, green: 0, red: 0, pending: 0 }) }),
  ];
}

/** Our analysis of the same synthetic entities, as a saved run would hold it. The run is never changed by the tests below. */
function buildRun(entities: EntityInput[] = entitiesFor()): RunRecord {
  const output = evaluateOptimization(engineInput(entities));
  return {
    runId: "test-run",
    createdAt: "2026-11-03T00:00:00.000Z",
    dataFetchedAt: "2026-11-03T00:00:00.000Z",
    dataSource: "demo",
    selected: RANGE,
    selectedDays: 7,
    selectedPartial: false,
    comparison: { current: null, previous: null, note: "" },
    ruleVersion: "stage2-v1",
    scope: { exclusions: [], excludedSpend: 0, unlistedSpend: null, note: "" },
    sources: {} as RunRecord["sources"],
    metricsSnapshot: { entities },
    output,
  } as unknown as RunRecord;
}

function csv(lines: string[]): Buffer {
  return Buffer.from([HEADER, ...lines].join("\n"), "utf8");
}

async function load(bytes: Buffer, mapping: SonilMapping = MAPPING, values: ValueMap = VALUES) {
  const file = await parseSonilFile(bytes, "csv");
  return { file, rows: normalizeSonilRows(file, mapping, values) };
}

async function buildXlsx(data: Array<Array<string | number | Date>>): Promise<Buffer> {
  const built = await writeXlsxFile(data as never, { dateFormat: "yyyy-mm-dd" });
  return built.toBuffer();
}

test("the file is read as CSV with its own delimiter, a byte-order mark and Windows line ends", async () => {
  const bytes = Buffer.from('﻿ad_id;spend;recommendation\r\n"9001";"1.234,50";"לשמור"\r\n', "utf8");
  const file = await parseSonilFile(bytes, "csv");
  assert.equal(file.delimiter, ";");
  assert.equal(file.encoding, "utf-8");
  assert.deepEqual(file.headers, ["ad_id", "spend", "recommendation"]);
  assert.equal(file.rows[0][0], "9001");
  assert.equal(readNumber(file.rows[0][1]).value, 1234.5);
});

test("a CSV that is not UTF-8 is read as Windows-1255, the encoding Hebrew Excel writes", async () => {
  // "שום" in Windows-1255 is 0xF9 0xE5 0xED: not valid UTF-8, so the file is read as Windows-1255.
  const bytes = Buffer.concat([Buffer.from([0xf9, 0xe5, 0xed, 0x2c]), Buffer.from("ad_id\n9001,1\n")]);
  const file = await parseSonilFile(bytes, "csv");
  assert.equal(file.encoding, "windows-1255");
  assert.equal(file.headers[0], "שום");
  assert.equal(file.rows[0][0], "9001");
});

test("an XLSX keeps text IDs exact, reads dates in UTC, and reports an ID that Excel stored as a rounded number", async () => {
  const bytes = await buildXlsx([
    ["ad_id", "adset_id", "campaign_id", "date", "spend", "leads", "recommendation"],
    ["120248773681350125", ADSET, CAMPAIGN, new Date(Date.UTC(2026, 9, 27)), 3500, 10, "לעצור"],
    [120248773681350125, ADSET, CAMPAIGN, new Date(Date.UTC(2026, 9, 27)), 3500, 10, "לעצור"],
  ]);
  const file = await parseSonilFile(bytes, "xlsx");
  const rows = normalizeSonilRows(file, MAPPING, VALUES);

  assert.equal(rows[0].level, "ad");
  assert.equal(rows[0].entityId, "120248773681350125", "a text ID is matched exactly");
  assert.equal(rows[0].date, "2026-10-27");
  assert.equal(rows[1].level, null, "a numeric ID with more than 15 digits is never matched");
  assert.match(rows[1].idProblem ?? "", /איבד דיוק/);
});

test("an XLSX that is not a zip, or whose entries would expand too far, is refused before it is read", async () => {
  await assert.rejects(parseSonilFile(Buffer.from("hello"), "xlsx"), SonilFileError);
  const bytes = await buildXlsx([["ad_id", "recommendation"], ["9001", "לשמור"]]);
  assert.equal(checkZipLimits(bytes), null);
  assert.match(checkZipLimits(bytes, 10) ?? "", /נפח/, "the uncompressed size is above the limit");
  assert.match(checkZipLimits(bytes, undefined, 0) ?? "", /יותר מדי קבצים/, "the entry count is above the limit");
  assert.match(checkZipLimits(Buffer.from("not a zip at all, just text")) ?? "", /אינו קובץ XLSX/);
});

test("date, number and ID cells are read by their own rules, and an unreadable cell is a problem, not a value", () => {
  assert.equal(readDate("27/10/2026").value, "2026-10-27", "day first, as in Israel");
  assert.equal(readDate("03/04/2026").value, "2026-04-03");
  assert.equal(readDate("2026-10-27 00:00:00").value, "2026-10-27");
  assert.equal(readDate("31/02/2026").value, null, "a day that does not exist is refused");
  assert.match(readDate("31/02/2026").problem ?? "", /לא זוהה/);

  assert.equal(readNumber("1,234.50").value, 1234.5);
  assert.equal(readNumber("1.234,50").value, 1234.5);
  assert.equal(readNumber("1,234").value, 1234, "a comma and three digits is a thousands separator");
  assert.equal(readNumber("12,5").value, 12.5);
  assert.equal(readNumber("₪ 3,500").value, 3500);
  assert.match(readNumber("abc").problem ?? "", /אינו מספר/);

  assert.equal(readId("120248773681350125").value, "120248773681350125");
  assert.equal(readId("  Ad-42 ").value, "Ad-42", "text is kept exactly, trimmed");
  assert.equal(readId({ raw: "1234" }).value, "1234");
  assert.equal(readId({ raw: "120248773681350130" }).value, null);
  assert.equal(cellText(new Date(Date.UTC(2026, 9, 27))), "2026-10-27");
});

test("a mapping needs a recommendation column and at least one ID, and no column can serve two fields", () => {
  assert.ok(mappingProblems({ ...emptyMapping(), adId: 0 }, 3).some((problem) => problem.includes("המלצת סוניל")));
  assert.ok(mappingProblems({ ...emptyMapping(), recommendation: 0 }, 3).some((problem) => problem.includes("מזהה אחד")));
  assert.ok(mappingProblems({ ...emptyMapping(), adId: 0, recommendation: 0 }, 3).some((problem) => problem.includes("גם")));
  assert.ok(mappingProblems({ ...emptyMapping(), adId: 5, recommendation: 1 }, 3).some((problem) => problem.includes("אינה קיימת")));
  assert.deepEqual(mappingProblems({ ...emptyMapping(), adId: 0, recommendation: 1 }, 3), []);
  assert.equal(parseMapping({ adId: "0" }), null, "a column number must be a number");
  assert.equal(parseValueMap({ לשמור: "BUY_MORE" }), null, "only action codes or unmapped are accepted");
  assert.deepEqual(parseValueMap({ "  לשמור  ": "KEEP" }), { לשמור: "KEEP" }, "the text is normalized");
});

test("the column hints come from the cells: an ID column reads as an ID, an amount column as a number", async () => {
  const { file } = await load(csv(["120248773681350125,7001,5001,27.10.2026,3500,10,לעצור"]));
  const hints = Object.fromEntries(profileColumns(file).map((column) => [column.header, column.hint]));
  assert.equal(hints.ad_id, "מזהה (ספרות)");
  assert.equal(hints.date, "תאריך");
  assert.equal(hints.spend, "מספר");
  assert.equal(hints.recommendation, "טקסט");
});

test("a clean file is matched by ID, checked against the run, and compared with our recommendations, which stay unchanged", async () => {
  const run = buildRun();
  const before = JSON.stringify(run);
  const { file, rows } = await load(
    csv([
      "9001,7001,5001,27.10.2026,3500,10,לעצור",
      "9002,7001,5001,27.10.2026,800,10,לעצור",
      "9003,7001,5001,27.10.2026,800,0,לשמור",
      "9999,7001,5001,27.10.2026,100,1,לשמור",
    ])
  );
  assert.deepEqual(mappingProblems(MAPPING, file.headers.length), []);

  const checks = checkSonilRows(run, rows, MAPPING);
  assert.equal(checks.matchedRows, 3);
  assert.equal(checks.unmatchedRows, 1, "9999 is not in the run, and is not matched by any other field");
  assert.deepEqual(checks.fileDates, { since: "2026-10-27", until: "2026-10-27" });
  assert.ok(checks.warnings.some((warning) => warning.includes("לא נמצאו בניתוח שלנו")));
  assert.ok(checks.warnings.some((warning) => warning.includes("לא נטענו במלואם")), "the third entity has no lead data in the run");
  assert.ok(!checks.warnings.some((warning) => warning.includes("ההוצאה שונה")), "spend agrees for every matched entity");

  const comparison = compareWithOwnRecommendations(run, rows);
  const outcomes = Object.fromEntries(comparison.map((row) => [row.key, row.outcome]));
  assert.deepEqual(outcomes, {
    "ad:9002": "disagreement",
    "ad:9001": "agreement",
    "ad:9003": "data_gap",
    "ad:9999": "data_gap",
  });
  assert.equal(comparison[0].key, "ad:9002", "disagreements come first");
  assert.equal(JSON.stringify(run), before, "the file never changes our recommendations");
});

test("a file outside the range, a different spend and a repeated day are each reported", async () => {
  const run = buildRun();
  const { rows } = await load(
    csv(["9001,7001,5001,01.10.2026,1000,10,לעצור", "9002,7001,5001,27.10.2026,800,10,לשמור", "9002,7001,5001,27.10.2026,800,10,לשמור"])
  );
  const checks = checkSonilRows(run, rows, MAPPING);
  assert.ok(checks.warnings.some((warning) => warning.includes("מחוץ לטווח שנבחר")), "a row is dated before the range");
  assert.ok(
    checks.warnings.some((warning) => warning.includes("ההוצאה שונה") && warning.includes("₪1,000") && warning.includes("₪3,500")),
    "the spend of 9001 is named with both figures"
  );
  assert.ok(checks.warnings.some((warning) => warning.includes("יותר משורה אחת לאותו תאריך")), "9002 is repeated on one day");
});

test("a recommendation text that is not mapped is a data gap, never a guessed comparison", async () => {
  const run = buildRun();
  const { rows } = await load(csv(["9001,7001,5001,27.10.2026,3500,10,טקסט שלא מופה"]));
  const row = compareWithOwnRecommendations(run, rows).find((item) => item.key === "ad:9001");
  assert.equal(row?.outcome, "data_gap");
  assert.match(row?.outcomeText ?? "", /לא מופה לפעולה/);
  assert.ok(checkSonilRows(run, rows, MAPPING).warnings.some((warning) => warning.includes("לא מופו לפעולה")));
});

test("a row with no ID at all is never matched by anything else in the row", async () => {
  const { rows } = await load(csv([",,,27.10.2026,3500,10,לעצור", "9001A,7001,5001,27.10.2026,3500,10,לעצור"]));
  assert.equal(rows[0].level, null);
  assert.match(rows[0].idProblem ?? "", /אין מזהה/);
  assert.equal(rows[1].level, "ad", "a text ID is kept exactly, and is matched only if it is in the run");
  assert.equal(rows[1].entityId, "9001A");
});
