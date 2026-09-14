import type { MetaFieldDataEntry } from "@/lib/leads/meta/types";

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

function findFieldValue(fieldData: MetaFieldDataEntry[], candidateNames: string[]): string | null {
  for (const candidate of candidateNames) {
    const entry = fieldData.find((field) => field.name?.toLowerCase() === candidate);
    const value = entry?.values?.[0]?.trim();
    if (value) return value;
  }
  return null;
}

export interface ParsedLeadContact {
  name: string | null;
  phone: string | null;
  email: string | null;
}

export function parseLeadContact(fieldData: MetaFieldDataEntry[] | undefined): ParsedLeadContact {
  const data = fieldData ?? [];

  const fullName = findFieldValue(data, FULL_NAME_FIELDS);
  const firstName = findFieldValue(data, FIRST_NAME_FIELDS);
  const lastName = findFieldValue(data, LAST_NAME_FIELDS);
  const name = fullName ?? [firstName, lastName].filter(Boolean).join(" ").trim();

  return {
    name: name || null,
    phone: findFieldValue(data, PHONE_FIELDS),
    email: findFieldValue(data, EMAIL_FIELDS),
  };
}
