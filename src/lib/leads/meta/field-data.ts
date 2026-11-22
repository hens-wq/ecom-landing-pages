import type { MetaFieldDataEntry } from "@/lib/leads/meta/types";
import { normalizeIsraeliPhone } from "@/lib/phone";

/**
 * `field_data` is a flat list of {name, values} pairs whose `name`s come from
 * the form's configured questions - standard Meta question keys plus any
 * custom questions the form author added. This is the one place that decides
 * which field names map to Name/Phone/Email, so it's easy to extend if a form
 * uses a field name not covered here (e.g. a custom-worded phone question).
 *
 * Explicitly NOT a generic "store every field" system: only Name/Phone/Email
 * are extracted, per the Phase 2B scope - a form's other custom questions are
 * available in the raw field_data server-side but are not surfaced.
 */
const FULL_NAME_FIELDS = ["full_name"];
const FIRST_NAME_FIELDS = ["first_name"];
const LAST_NAME_FIELDS = ["last_name"];
const PHONE_FIELDS = ["phone_number", "phone"];
const EMAIL_FIELDS = ["email"];

/** A phone written in one of its explicit forms: a leading 0, +972, 972 or 00972, then digits and separators. Letters never match. */
const PHONE_SHAPED = /^(?:\+972|00972|972|0)[\d\s().-]*$/;
/** An Israeli mobile (05x) or landline (0 + area digit 2-4, 8, 9) in its national form, 9 or 10 digits in total. */
const ISRAELI_PHONE = /^(?:05\d{8}|0[2-489]\d{7})$/;

function findFieldValue(fieldData: MetaFieldDataEntry[], candidateNames: string[]): string | null {
  for (const candidate of candidateNames) {
    const entry = fieldData.find((field) => field.name?.toLowerCase() === candidate);
    const value = entry?.values?.[0]?.trim();
    if (value) return value;
  }
  return null;
}

/**
 * Any other question whose answer is a phone number in an explicit form. It is used only for matching a CRM
 * update to a lead when the form has no standard phone question. Name, email and ID-like digits never qualify.
 */
function findPhoneShapedValue(fieldData: MetaFieldDataEntry[]): string | null {
  for (const field of fieldData) {
    for (const raw of field.values ?? []) {
      const value = raw?.trim();
      if (!value || !PHONE_SHAPED.test(value)) continue;
      if (ISRAELI_PHONE.test(normalizeIsraeliPhone(value))) return value;
    }
  }
  return null;
}

export interface ParsedLeadContact {
  name: string | null;
  phone: string | null;
  email: string | null;
  /**
   * The phone used to match a CRM update to this lead: the standard phone question when present, otherwise a
   * phone-shaped answer to any other question. The displayed phone is not changed by the fallback.
   */
  matchPhone: string | null;
}

export function parseLeadContact(fieldData: MetaFieldDataEntry[] | undefined): ParsedLeadContact {
  const data = fieldData ?? [];

  const fullName = findFieldValue(data, FULL_NAME_FIELDS);
  const firstName = findFieldValue(data, FIRST_NAME_FIELDS);
  const lastName = findFieldValue(data, LAST_NAME_FIELDS);
  const name = fullName ?? [firstName, lastName].filter(Boolean).join(" ").trim();
  const phone = findFieldValue(data, PHONE_FIELDS);

  return {
    name: name || null,
    phone,
    email: findFieldValue(data, EMAIL_FIELDS),
    matchPhone: phone ?? findPhoneShapedValue(data),
  };
}
