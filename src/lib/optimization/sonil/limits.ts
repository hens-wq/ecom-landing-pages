/**
 * Limits for a Sonil upload. They protect the server from oversized or hostile files. They are not business rules.
 */

/** Stays below the platform's request body limit, so a larger file fails with a clear message instead of a timeout. */
export const SONIL_MAX_FILE_BYTES = 4 * 1024 * 1024;
export const SONIL_MAX_ROWS = 20_000;
export const SONIL_MAX_COLUMNS = 200;
/** An XLSX is a zip file. Its entries may not expand beyond this total, and may not be more than the entry count below. */
export const SONIL_MAX_UNCOMPRESSED_BYTES = 25 * 1024 * 1024;
export const SONIL_MAX_ZIP_ENTRIES = 300;

/** How many rows the preview shows. */
export const SONIL_SAMPLE_ROWS = 10;
/** How many example entities a warning names. */
export const SONIL_LIST_LIMIT = 5;
/** How many row problems are returned. The rest are counted, not listed. */
export const SONIL_ROW_PROBLEM_LIMIT = 50;

/**
 * Assumption, not a figure from the spec: a spend difference is a real mismatch only when it is above both this share of our
 * spend and this many shekels. Smaller gaps are rounding and time-zone effects between the two reports.
 */
export const SONIL_SPEND_TOLERANCE_PCT = 1;
export const SONIL_SPEND_TOLERANCE_ILS = 5;
/** Lead counts must match exactly. A lead is a whole record, so there is no tolerance. */
export const SONIL_LEADS_TOLERANCE = 0;
