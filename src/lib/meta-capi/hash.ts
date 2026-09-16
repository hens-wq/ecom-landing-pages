import "server-only";

import { createHash } from "node:crypto";

import { normalizeIsraeliPhone } from "@/lib/phone";

/** Meta's required hashing for every user_data field: lowercase + trim, then sha256, hex-encoded. Never log the input or the output next to any other identifying field - a hash is only non-reversible until it's paired with the record it came from. */
export function sha256Hex(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

/**
 * Meta CAPI wants phone numbers as digits only, with country code, no
 * leading '+' or '0' - a DIFFERENT normalized shape than lib/phone.ts's own
 * "0521234567" (which exists for this app's internal matching/display, not
 * for Meta). This converts from that shape into Meta's shape, then hashes.
 * Returns null for anything that doesn't normalize to a plausible Israeli
 * mobile/landline number - Meta silently ignores a malformed `ph` entry
 * anyway, so there's no point sending one.
 */
export function hashPhoneForCapi(rawPhone: string): string | null {
  const normalized = normalizeIsraeliPhone(rawPhone);
  if (!normalized.startsWith("0") || normalized.length < 9) return null;
  const international = `972${normalized.slice(1)}`;
  return sha256Hex(international);
}
