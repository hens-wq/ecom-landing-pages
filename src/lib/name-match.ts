/**
 * Name-mismatch detection - deliberately isolated from lib/matching.ts.
 *
 * Phone number is the ONLY thing that decides whether a sale is attributed to a
 * lead (see lib/matching.ts). This module never influences that decision; it only
 * flags, for a sale that already matched by phone, whether the customer name on
 * the sheet looks like a different person than the lead's name - purely
 * informational, so a human can sanity-check invoices filed under a spouse's
 * name, a nickname, a company name, etc.
 */
function normalizeFullName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function firstToken(name: string): string {
  return normalizeFullName(name).split(" ")[0] ?? "";
}

/**
 * True when the two names look like they could belong to different people.
 * Deliberately lenient - an exact match, or agreement on just the first name
 * (covers nicknames/short forms like "חן" for "חן סויסה"), is NOT a mismatch.
 * Only a genuine first-name disagreement ("קרן" vs "רונן", "משה" vs "משפחת") is
 * flagged.
 */
export function hasNameMismatch(leadName: string, saleName: string): boolean {
  const leadFull = normalizeFullName(leadName);
  const saleFull = normalizeFullName(saleName);
  if (!leadFull || !saleFull || leadFull === saleFull) return false;

  const leadFirst = firstToken(leadName);
  const saleFirst = firstToken(saleName);
  if (!leadFirst || !saleFirst) return false;

  return leadFirst !== saleFirst;
}
