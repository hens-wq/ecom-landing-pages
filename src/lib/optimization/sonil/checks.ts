import { formatIls } from "@/lib/optimization/format";
import type { ActionCode } from "@/lib/optimization/labels";
import { entityKey, type EntityInput, type Level } from "@/lib/optimization/model";
import type { RunRecord } from "@/lib/optimization/run";
import type { SonilMapping } from "@/lib/optimization/sonil/mapping";
import type { NormalizedSonilRow } from "@/lib/optimization/sonil/normalize";
import {
  SONIL_LEADS_TOLERANCE,
  SONIL_LIST_LIMIT,
  SONIL_ROW_PROBLEM_LIMIT,
  SONIL_SPEND_TOLERANCE_ILS,
  SONIL_SPEND_TOLERANCE_PCT,
} from "@/lib/optimization/sonil/limits";

/**
 * Checks a Sonil file against our own analysis of the same range. Every row is matched by its ID only. A name is never used
 * to match. The checks report and never change the analysis: our recommendations are read here, not written.
 */

export interface SonilDateSpan {
  since: string;
  until: string;
}

export interface RecommendationValueSummary {
  text: string;
  count: number;
  action: ActionCode | null;
}

export interface SonilChecks {
  rowCount: number;
  matchedRows: number;
  unmatchedRows: number;
  /** The first and last date in the file, or null when no row has a readable date. */
  fileDates: SonilDateSpan | null;
  /** Problems for the whole file, in Hebrew, each one stated as it is. */
  warnings: string[];
  /** Problems for single rows, capped at SONIL_ROW_PROBLEM_LIMIT. */
  rowProblems: Array<{ rowNumber: number; message: string }>;
  /** Every row problem, including the ones not listed. */
  rowProblemCount: number;
  recommendationValues: RecommendationValueSummary[];
  entities: { matched: number; inFileOnly: number; inRunOnly: number; spendMismatches: number; leadsMismatches: number };
}

function shortDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

function listOf(entities: EntityInput[]): string {
  if (entities.length === 0) return "";
  const names = entities.slice(0, SONIL_LIST_LIMIT).map((entity) => entity.name);
  return ` (לדוגמה: ${names.join(", ")})`;
}

export function checkSonilRows(run: RunRecord, rows: NormalizedSonilRow[], mapping: SonilMapping): SonilChecks {
  const entities = new Map<string, EntityInput>();
  for (const entity of run.metricsSnapshot.entities) entities.set(entityKey(entity.level, entity.id), entity);

  const warnings: string[] = [];
  const rowProblems: Array<{ rowNumber: number; message: string }> = [];
  let rowProblemCount = 0;
  const problem = (rowNumber: number, message: string): void => {
    rowProblemCount += 1;
    if (rowProblems.length < SONIL_ROW_PROBLEM_LIMIT) rowProblems.push({ rowNumber, message });
  };

  // 1. Each row is matched by its ID only.
  const matched = new Map<string, NormalizedSonilRow[]>();
  const fileKeys = new Set<string>();
  let unmatchedRows = 0;
  for (const row of rows) {
    if (row.level === null || row.entityId === null) {
      unmatchedRows += 1;
      problem(row.rowNumber, row.idProblem ?? "השורה לא מותאמת.");
      continue;
    }
    const key = entityKey(row.level, row.entityId);
    fileKeys.add(key);
    const entity = entities.get(key);
    if (!entity) {
      unmatchedRows += 1;
      problem(row.rowNumber, "המזהה לא נמצא בניתוח שלנו. לא מותאם לפי שם.");
      continue;
    }
    const campaignMismatch = row.campaignId !== null && row.campaignId !== entity.campaignId;
    const adSetMismatch = row.level === "ad" && row.adSetId !== null && row.adSetId !== entity.parentId;
    if (campaignMismatch || adSetMismatch) {
      unmatchedRows += 1;
      problem(row.rowNumber, "מזהה הקמפיין או ה-Ad Set בשורה לא תואם למיקום של היחידה במערכת.");
      continue;
    }
    matched.set(key, [...(matched.get(key) ?? []), row]);
  }
  const matchedRows = [...matched.values()].reduce((total, list) => total + list.length, 0);
  if (unmatchedRows > 0) warnings.push(`${unmatchedRows} שורות לא הותאמו ליחידה בניתוח שלנו. הפירוט מופיע בשורות עצמן.`);

  // 2. The dates: the span of the file, and whether it matches the range that was selected.
  const dates = rows.map((row) => row.date).filter((date): date is string => date !== null);
  let fileDates: SonilDateSpan | null = null;
  for (const date of dates) {
    if (fileDates === null) fileDates = { since: date, until: date };
    if (date < fileDates.since) fileDates.since = date;
    if (date > fileDates.until) fileDates.until = date;
  }
  const dateProblems = rows.filter((row) => row.dateProblem !== null).length;
  const selected = run.selected;
  if (mapping.date === null) {
    warnings.push("לא נמצאה עמודת תאריך בקובץ: לא ניתן לאמת שהנתונים מתאימים לטווח שנבחר.");
  } else if (fileDates === null) {
    warnings.push("אף שורה בקובץ אינה עם תאריך תקין: לא ניתן לאמת את הטווח.");
  } else {
    const outside = dates.filter((date) => date < selected.since || date > selected.until).length;
    if (outside > 0) {
      warnings.push(
        `${outside} שורות בקובץ מחוץ לטווח שנבחר (${shortDate(selected.since)}–${shortDate(selected.until)}). הקובץ מכיל תאריכים מ-${shortDate(fileDates.since)} עד ${shortDate(fileDates.until)}.`
      );
    } else if (fileDates.since > selected.since || fileDates.until < selected.until) {
      warnings.push(
        `הקובץ מכסה רק ${shortDate(fileDates.since)}–${shortDate(fileDates.until)} מתוך הטווח שנבחר (${shortDate(selected.since)}–${shortDate(selected.until)}).`
      );
    }
  }
  if (dateProblems > 0) warnings.push(`${dateProblems} שורות עם תאריך שלא זוהה. הן לא נבדקו מול הטווח.`);

  // 3. The same entity twice on the same day would count its spend twice.
  let duplicateDays = 0;
  let undatedRepeats = 0;
  for (const list of matched.values()) {
    if (mapping.date !== null) {
      const perDay = new Map<string, number>();
      for (const row of list) {
        if (row.date !== null) perDay.set(row.date, (perDay.get(row.date) ?? 0) + 1);
      }
      duplicateDays += [...perDay.values()].filter((count) => count > 1).length;
    } else if (list.length > 1) {
      undatedRepeats += 1;
    }
  }
  if (duplicateDays > 0) {
    warnings.push(`${duplicateDays} מקרים של יחידה עם יותר משורה אחת לאותו תאריך. אם השורות כפולות, ההוצאה והלידים ייספרו פעמיים.`);
  }
  if (undatedRepeats > 0) {
    warnings.push(`${undatedRepeats} יחידות מופיעות ביותר משורה אחת בלי עמודת תאריך. ההוצאה והלידים מסוכמים מכל השורות: ודאו שזה נכון.`);
  }

  // 4. Which entities the file covers, and which entities with delivery in the range it leaves out.
  const levelsInFile = new Set<Level>();
  for (const row of rows) {
    if (row.level !== null) levelsInFile.add(row.level);
  }
  const inFileOnly = [...fileKeys].filter((key) => !entities.has(key));
  const inRunOnly = run.metricsSnapshot.entities.filter(
    (entity) =>
      levelsInFile.has(entity.level) &&
      (entity.selected.spend > 0 || entity.selected.impressions > 0) &&
      !matched.has(entityKey(entity.level, entity.id))
  );
  if (inFileOnly.length > 0) warnings.push(`${inFileOnly.length} מזהים בקובץ לא נמצאו בניתוח שלנו. לא מותאמים לפי שם.`);
  if (inRunOnly.length > 0) warnings.push(`${inRunOnly.length} יחידות עם הוצאה בטווח שנבחר חסרות בקובץ${listOf(inRunOnly)}.`);

  // 5. Spend and leads per entity, against our own figures for the same range.
  let spendMismatches = 0;
  let leadsMismatches = 0;
  let leadsNotLoaded = 0;
  const spendExamples: string[] = [];
  const leadsExamples: string[] = [];
  for (const [key, list] of matched) {
    const entity = entities.get(key);
    if (!entity) continue;
    if (mapping.spend !== null) {
      const fileSpend = list.reduce((total, row) => total + (row.spend ?? 0), 0);
      const ours = entity.selected.spend;
      const tolerance = Math.max(SONIL_SPEND_TOLERANCE_ILS, (ours * SONIL_SPEND_TOLERANCE_PCT) / 100);
      if (Math.abs(fileSpend - ours) > tolerance) {
        spendMismatches += 1;
        if (spendExamples.length < SONIL_LIST_LIMIT) spendExamples.push(`${entity.name}: בקובץ ${formatIls(fileSpend)}, אצלנו ${formatIls(ours)}`);
      }
    }
    if (mapping.leads !== null) {
      if (!entity.selected.leadsKnown) {
        leadsNotLoaded += 1;
        continue;
      }
      const fileLeads = list.reduce((total, row) => total + (row.leads ?? 0), 0);
      const ours = entity.selected.leads;
      if (Math.abs(fileLeads - ours) > SONIL_LEADS_TOLERANCE) {
        leadsMismatches += 1;
        if (leadsExamples.length < SONIL_LIST_LIMIT) leadsExamples.push(`${entity.name}: בקובץ ${fileLeads}, אצלנו ${ours}`);
      }
    }
  }
  if (mapping.spend === null) {
    warnings.push("לא נמצאה עמודת הוצאה: ההוצאה לא נבדקה מול הנתונים שלנו.");
  } else {
    const spendProblems = rows.filter((row) => row.spendProblem !== null).length;
    if (spendProblems > 0) warnings.push(`${spendProblems} שורות עם הוצאה שלא זוהתה לא נכללו בהשוואת ההוצאה.`);
    if (spendMismatches > 0) {
      warnings.push(`ההוצאה שונה מהנתונים שלנו ב-${spendMismatches} יחידות (${spendExamples.join("; ")}).`);
    }
  }
  if (mapping.leads === null) {
    warnings.push("לא נמצאה עמודת לידים: הלידים לא נבדקו מול הנתונים שלנו.");
  } else if (leadsNotLoaded > 0) {
    warnings.push("הלידים בניתוח שלנו לא נטענו במלואם, ולכן לידי הקובץ לא נבדקו מולם.");
  } else if (leadsMismatches > 0) {
    warnings.push(`מספר הלידים שונה מהנתונים שלנו ב-${leadsMismatches} יחידות (${leadsExamples.join("; ")}).`);
  }

  // 6. Each recommendation text must be mapped to an action before it can be compared.
  const valueCounts = new Map<string, { count: number; action: ActionCode | null }>();
  for (const row of rows) {
    if (row.recommendationText === null) continue;
    const current = valueCounts.get(row.recommendationText);
    valueCounts.set(row.recommendationText, { count: (current?.count ?? 0) + 1, action: row.action });
  }
  const recommendationValues = [...valueCounts.entries()]
    .map(([text, value]) => ({ text, count: value.count, action: value.action }))
    .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, "he"));
  if (mapping.recommendation !== null && recommendationValues.length === 0) {
    warnings.push("עמודת ההמלצה ריקה בכל השורות: אין מה להשוות.");
  }
  const unmappedValues = recommendationValues.filter((value) => value.action === null).length;
  if (unmappedValues > 0) {
    warnings.push(`${unmappedValues} ערכי המלצה לא מופו לפעולה. השורות עם הערכים האלה ייחשבו כפער בנתונים עד שימופו.`);
  }

  return {
    rowCount: rows.length,
    matchedRows,
    unmatchedRows,
    fileDates,
    warnings,
    rowProblems,
    rowProblemCount,
    recommendationValues,
    entities: {
      matched: matched.size,
      inFileOnly: inFileOnly.length,
      inRunOnly: inRunOnly.length,
      spendMismatches,
      leadsMismatches,
    },
  };
}
