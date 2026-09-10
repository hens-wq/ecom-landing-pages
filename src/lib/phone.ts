/**
 * Israeli phone number normalization.
 *
 * Intentionally isolated from any UI or matching-engine code: Phase 2 can swap
 * this out (e.g. for a full libphonenumber-based implementation) without touching
 * the Sales & Matching page or anything that calls `phonesMatch`.
 *
 * Normalizes all of these to the same value ("0521234567"):
 *   0521234567
 *   052-123-4567
 *   +972521234567
 *   972521234567
 *   052 123 4567
 */
export function normalizeIsraeliPhone(raw: string): string {
  if (!raw) return "";

  const hasPlus = raw.trim().startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  // Strip the country code (972) whether it arrived as "+972..." or "972...".
  // The length check on the bare "972..." form guards against misreading a local
  // number that happens to start with those digits (not a realistic case for
  // Israeli numbers, but cheap to guard against).
  let national = digits;
  if (digits.startsWith("972") && (hasPlus || digits.length > 9)) {
    national = digits.slice(3);
  }

  if (!national.startsWith("0")) {
    national = `0${national}`;
  }

  return national;
}

export function phonesMatch(a: string, b: string): boolean {
  const normalizedA = normalizeIsraeliPhone(a);
  const normalizedB = normalizeIsraeliPhone(b);
  return normalizedA.length > 0 && normalizedA === normalizedB;
}

/** "0521234567" -> "052-123-4567" for display. Falls back to the raw input if the shape is unexpected. */
export function formatPhoneDisplay(raw: string): string {
  const normalized = normalizeIsraeliPhone(raw);
  if (/^0\d{2}\d{7}$/.test(normalized)) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
  }
  if (/^0\d{8}$/.test(normalized)) {
    return `${normalized.slice(0, 2)}-${normalized.slice(2)}`;
  }
  return normalized || raw;
}
