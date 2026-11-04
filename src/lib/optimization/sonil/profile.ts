import { cellText, isBlank, isRoundedNumber, readDate, readId, readNumber } from "@/lib/optimization/sonil/cells";
import type { ParsedSonilFile } from "@/lib/optimization/sonil/parse";

/**
 * What each column holds, read from its cells only. The hint is shown to the person and never sets a mapping: column names
 * are not guessed, the person maps every column.
 */

export type ColumnHint = "מזהה (ספרות)" | "תאריך" | "מספר" | "טקסט" | "ריק";

export interface ColumnProfile {
  index: number;
  header: string;
  filled: number;
  hint: ColumnHint;
  /** Up to three filled values, as text, so the person can see what the column holds. */
  samples: string[];
  /** Numeric cells in this column that Excel stored with more than 15 digits. Their IDs are already rounded in the file. */
  roundedNumbers: number;
}

/** A column gets a hint when at least this share of its filled cells read as that kind of value. */
const HINT_SHARE = 0.8;
const SAMPLE_COUNT = 3;

export function profileColumns(file: ParsedSonilFile): ColumnProfile[] {
  return file.headers.map((header, index) => {
    let filled = 0;
    let ids = 0;
    let dates = 0;
    let numbers = 0;
    let rounded = 0;
    const samples: string[] = [];
    for (const row of file.rows) {
      const cell = row[index];
      if (isBlank(cell)) continue;
      filled += 1;
      if (samples.length < SAMPLE_COUNT) samples.push(cellText(cell));
      // The hint says "ID" for at least six digits and nothing else: a short whole number is an amount, and a date has dots.
      const id = readId(cell).value;
      if (id !== null && /^\d{6,}$/.test(id)) ids += 1;
      if (readDate(cell).value !== null) dates += 1;
      if (readNumber(cell).value !== null) numbers += 1;
      if (isRoundedNumber(cell)) rounded += 1;
    }
    return { index, header, filled, hint: hintFor(filled, { ids, dates, numbers }), samples, roundedNumbers: rounded };
  });
}

function hintFor(filled: number, counts: { ids: number; dates: number; numbers: number }): ColumnHint {
  if (filled === 0) return "ריק";
  if (counts.ids / filled >= HINT_SHARE) return "מזהה (ספרות)";
  if (counts.dates / filled >= HINT_SHARE) return "תאריך";
  if (counts.numbers / filled >= HINT_SHARE) return "מספר";
  return "טקסט";
}
