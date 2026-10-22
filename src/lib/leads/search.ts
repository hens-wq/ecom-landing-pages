import type { MetaFormLead } from "@/lib/leads/types";
import { normalizeIsraeliPhone } from "@/lib/phone";

/** Fewer digits than this and a phone match would hit almost every lead by accident. */
const MIN_PHONE_DIGITS = 4;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Name or phone search for the Leads table. Phone matching is forgiving: the
 * query and the stored phone are both reduced to digits after normalizing to
 * the Israeli national form, so "0528678178", "052-867-8178", "052 867 8178"
 * and "+972-52-867-8178" all find the same lead. A partial phone also matches
 * as a substring once it's long enough (see MIN_PHONE_DIGITS).
 */
export function leadMatchesSearch(lead: MetaFormLead, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  if (lead.name && lead.name.toLowerCase().includes(trimmed.toLowerCase())) return true;

  const queryVariants = [digitsOnly(trimmed), digitsOnly(normalizeIsraeliPhone(trimmed))].filter((variant) => variant.length >= MIN_PHONE_DIGITS);
  if (queryVariants.length === 0) return false;

  const leadPhones = [lead.normalizedPhone, lead.phone]
    .filter((value): value is string => Boolean(value))
    .map((value) => digitsOnly(normalizeIsraeliPhone(value)));

  return leadPhones.some((phone) => queryVariants.some((variant) => phone.includes(variant)));
}
