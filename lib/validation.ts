import type { LeadFormValues } from "@/lib/types";

/**
 * Accepts Israeli mobile, landline and 07x VOIP numbers, with or without a
 * country code, and with any mix of spaces/dashes/parentheses — because
 * real users on mobile paste and autofill numbers in all of those shapes.
 * Deliberately does not require a specific formatting style.
 */
const IL_PHONE_PATTERN = /^(?:\+972|972|0)(5\d{8}|7\d{8}|[23489]\d{7})$/;

export function normalizePhone(value: string): string {
  return value.replace(/[\s\-().]/g, "");
}

export function isValidIsraeliPhone(value: string): boolean {
  return IL_PHONE_PATTERN.test(normalizePhone(value));
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export type LeadFormErrors = Partial<Record<keyof LeadFormValues, string>>;

export function validateLeadForm(values: LeadFormValues): LeadFormErrors {
  const errors: LeadFormErrors = {};

  if (!values.fullName.trim() || values.fullName.trim().length < 2) {
    errors.fullName = "נא להזין שם מלא";
  }

  if (!values.phone.trim()) {
    errors.phone = "נא להזין מספר טלפון";
  } else if (!isValidIsraeliPhone(values.phone)) {
    errors.phone = "מספר הטלפון אינו תקין";
  }

  if (!values.email.trim()) {
    errors.email = "נא להזין כתובת אימייל";
  } else if (!isValidEmail(values.email)) {
    errors.email = "כתובת האימייל אינה תקינה";
  }

  return errors;
}
