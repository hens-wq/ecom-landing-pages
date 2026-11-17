import type { NumericToken, RawCell } from "@/lib/optimization/sonil/parse";

/**
 * Reads one cell into the value it stands for. Each reader returns the value or, when the cell cannot be read, a Hebrew
 * problem. A blank cell is neither a value nor a problem.
 */

export const IDS_ROUNDED_MESSAGE =
  "המזהה נשמר כמספר ב-Excel, וייתכן שאיבד דיוק (Excel שומר עד 15 ספרות). שמרו את עמודת המזהים כטקסט או ייצאו את הקובץ כ-CSV.";

export function isNumericToken(cell: RawCell | undefined): cell is NumericToken {
  return typeof cell === "object" && cell !== null && !(cell instanceof Date) && "raw" in cell;
}

export function isBlank(cell: RawCell | undefined): boolean {
  return cell === undefined || cell === null || (typeof cell === "string" && cell.trim() === "");
}

/** The text a cell shows, trimmed. Dates are shown as YYYY-MM-DD. */
export function cellText(cell: RawCell | undefined): string {
  if (cell === undefined || cell === null) return "";
  if (typeof cell === "string") return cell.trim();
  if (typeof cell === "boolean") return cell ? "TRUE" : "FALSE";
  if (cell instanceof Date) return Number.isNaN(cell.getTime()) ? "" : cell.toISOString().slice(0, 10);
  return cell.raw;
}

export interface CellRead<T> {
  value: T | null;
  problem: string | null;
}

/**
 * An ID cell. Text is kept exactly as written, so it can be matched exactly. A number in the file is refused when it has more
 * than 15 digits (or is in exponent form): Excel has already rounded it, so matching it would be a guess.
 */
export function readId(cell: RawCell | undefined): CellRead<string> {
  if (isBlank(cell)) return { value: null, problem: null };
  if (typeof cell === "string") return { value: cell.trim(), problem: null };
  if (isNumericToken(cell)) {
    return /^\d{1,15}$/.test(cell.raw) ? { value: cell.raw, problem: null } : { value: null, problem: IDS_ROUNDED_MESSAGE };
  }
  return { value: null, problem: "סוג התא אינו מזהה. נדרש טקסט או מספר שלם." };
}

/**
 * A date cell, as YYYY-MM-DD. Accepted: a real Excel date, an Excel day number, ISO (2026-10-27), and day/month/year with
 * "/" or "." (the Israeli order). Month-first dates are not accepted, because a date such as 03/04/2026 cannot be read safely.
 */
export function readDate(cell: RawCell | undefined): CellRead<string> {
  if (isBlank(cell)) return { value: null, problem: null };
  const unreadable = { value: null, problem: `התאריך "${cellText(cell)}" לא זוהה.` };

  if (cell instanceof Date) {
    return Number.isNaN(cell.getTime()) ? unreadable : { value: cell.toISOString().slice(0, 10), problem: null };
  }
  if (isNumericToken(cell)) {
    const serial = Number(cell.raw);
    if (!Number.isFinite(serial) || serial < 1 || serial > 2_958_465) return unreadable;
    // Excel counts days from 1899-12-30. The time of day, if any, is dropped.
    const day = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000);
    return { value: day.toISOString().slice(0, 10), problem: null };
  }
  if (typeof cell === "string") {
    const text = cell.trim();
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T].*)?$/.exec(text);
    const israeli = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(text);
    const parts = iso ? [Number(iso[1]), Number(iso[2]), Number(iso[3])] : israeli ? [Number(israeli[3]), Number(israeli[2]), Number(israeli[1])] : null;
    if (!parts) return unreadable;
    const [year, month, day] = parts;
    const check = new Date(Date.UTC(year, month - 1, day));
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return unreadable;
    return { value: check.toISOString().slice(0, 10), problem: null };
  }
  return unreadable;
}

/**
 * A number cell. Accepts a plain number, a shekel sign, spaces, and either "." or "," as the decimal point. A comma followed by
 * exactly three digits, as in 1,234, is a thousands separator.
 */
export function readNumber(cell: RawCell | undefined): CellRead<number> {
  if (isBlank(cell)) return { value: null, problem: null };
  if (isNumericToken(cell)) {
    const value = Number(cell.raw);
    return Number.isFinite(value) ? { value, problem: null } : { value: null, problem: `הערך "${cell.raw}" אינו מספר.` };
  }
  if (typeof cell !== "string") return { value: null, problem: "סוג התא אינו מספר." };

  let text = cell.replace(/[₪\s ]/g, "");
  if (text.includes(",") && text.includes(".")) {
    // The separator that comes last is the decimal point. The other one groups thousands.
    text = text.lastIndexOf(",") > text.lastIndexOf(".") ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
  } else if (text.includes(",")) {
    text = /^-?\d{1,3}(,\d{3})+$/.test(text) ? text.replace(/,/g, "") : text.replace(",", ".");
  }
  return /^-?\d+(\.\d+)?$/.test(text)
    ? { value: Number(text), problem: null }
    : { value: null, problem: `הערך "${cell.trim()}" אינו מספר.` };
}

/** A numeric cell that Excel stored with more than 15 digits, or in exponent form: its ID is already rounded in the file. */
export function isRoundedNumber(cell: RawCell | undefined): boolean {
  if (!isNumericToken(cell)) return false;
  const integerDigits = cell.raw.split(".")[0].replace(/\D/g, "");
  return integerDigits.length > 15 || /[eE]/.test(cell.raw);
}
