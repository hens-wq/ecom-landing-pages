"use client";

import { useState, type FormEvent } from "react";
import { submitLead } from "@/lib/leads/submitLead";
import { trackLeadSubmitted } from "@/lib/tracking/analytics";
import { useTrackingContext } from "@/lib/tracking/useTrackingContext";
import { validateLeadForm, type LeadFormErrors } from "@/lib/validation";
import type { LandingPageId, LeadFormValues, LeadSubmissionStatus } from "@/lib/types";

const EMPTY_VALUES: LeadFormValues = { fullName: "", phone: "", email: "" };

/**
 * Shared state/submit logic behind every lead form on a page. A single
 * page legitimately needs several forms with very different visual
 * compositions (hero-embedded, mid-page, final) that must all behave
 * identically — this hook is that shared behavior; each section owns its
 * own markup via LeadFormFields.
 */
export function useLeadForm(landingPageId: LandingPageId) {
  const tracking = useTrackingContext(landingPageId);
  const [values, setValues] = useState<LeadFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<LeadFormErrors>({});
  const [status, setStatus] = useState<LeadSubmissionStatus>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  function updateField(field: keyof LeadFormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validateLeadForm(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setStatus("submitting");
    setSubmitError(null);

    const result = await submitLead(values, tracking);

    if (result.ok) {
      setStatus("success");
      trackLeadSubmitted(landingPageId);
    } else {
      setStatus("error");
      setSubmitError(result.error ?? "אירעה שגיאה. נסו שוב.");
    }
  }

  return {
    values,
    errors,
    status,
    submitError,
    tracking,
    updateField,
    handleSubmit,
  } as const;
}
