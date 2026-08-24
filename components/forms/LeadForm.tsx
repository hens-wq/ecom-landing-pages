"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Mail, Phone, User } from "lucide-react";
import { CTAButton } from "@/components/ui/CTAButton";
import { FormSuccessState } from "@/components/forms/FormSuccessState";
import { submitLead } from "@/lib/leads/submitLead";
import { trackLeadSubmitted } from "@/lib/tracking/analytics";
import { useTrackingContext } from "@/lib/tracking/useTrackingContext";
import { validateLeadForm, type LeadFormErrors } from "@/lib/validation";
import type { LandingPageId, LeadFormValues, LeadSubmissionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface LeadFormProps {
  landingPageId: LandingPageId;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  variant?: "card" | "flush";
  className?: string;
}

const EMPTY_VALUES: LeadFormValues = { fullName: "", phone: "", email: "" };

const FIELD_CLASS =
  "h-13 w-full rounded-xl border border-white/15 bg-ink-900/70 py-3.5 ps-11 pe-4 text-base text-off-white placeholder:text-ink-400 outline-none transition-colors focus:border-brand-400 focus:bg-ink-900";

export function LeadForm({
  landingPageId,
  title = "השאירו פרטים ונחזור אליכם",
  subtitle,
  ctaLabel = "לקבלת פרטים",
  variant = "card",
  className,
}: LeadFormProps) {
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

  return (
    <div
      id="lead-form"
      className={cn(
        variant === "card" &&
          "border border-white/10 bg-ink-800/60 p-6 backdrop-blur-sm sm:p-8",
        className,
      )}
    >
      <AnimatePresence mode="wait">
        {status === "success" ? (
          <FormSuccessState key="success" />
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-4"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {(title || subtitle) && (
              <div className="mb-1 space-y-1.5">
                {title && <p className="text-display-sm text-off-white">{title}</p>}
                {subtitle && <p className="text-sm text-ink-300">{subtitle}</p>}
              </div>
            )}

            <input type="hidden" name="landingPageId" value={tracking.landingPageId} />
            <input type="hidden" name="pageUrl" value={tracking.pageUrl} />
            <input type="hidden" name="utm_source" value={tracking.utm_source ?? ""} />
            <input type="hidden" name="utm_medium" value={tracking.utm_medium ?? ""} />
            <input type="hidden" name="utm_campaign" value={tracking.utm_campaign ?? ""} />
            <input type="hidden" name="utm_content" value={tracking.utm_content ?? ""} />
            <input type="hidden" name="utm_term" value={tracking.utm_term ?? ""} />
            <input type="hidden" name="fbclid" value={tracking.fbclid ?? ""} />
            <input type="hidden" name="gclid" value={tracking.gclid ?? ""} />

            <Field
              id="fullName"
              icon={<User className="size-[18px]" aria-hidden />}
              placeholder="שם מלא"
              autoComplete="name"
              value={values.fullName}
              error={errors.fullName}
              onChange={(v) => updateField("fullName", v)}
            />

            <Field
              id="phone"
              type="tel"
              inputMode="tel"
              dir="ltr"
              icon={<Phone className="size-[18px]" aria-hidden />}
              placeholder="050-1234567"
              autoComplete="tel"
              value={values.phone}
              error={errors.phone}
              onChange={(v) => updateField("phone", v)}
            />

            <Field
              id="email"
              type="email"
              inputMode="email"
              dir="ltr"
              icon={<Mail className="size-[18px]" aria-hidden />}
              placeholder="example@mail.com"
              autoComplete="email"
              value={values.email}
              error={errors.email}
              onChange={(v) => updateField("email", v)}
            />

            {submitError && (
              <p role="alert" className="text-sm text-red-400">
                {submitError}
              </p>
            )}

            <CTAButton
              type="submit"
              fullWidth
              loading={status === "submitting"}
              className="mt-1"
            >
              {ctaLabel}
            </CTAButton>

            <p className="text-center text-xs text-ink-500">
              בשליחת הפרטים אני מאשר/ת יצירת קשר בנוגע לתוכן שביקשתי.
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

interface FieldProps {
  id: keyof LeadFormValues;
  icon: ReactNode;
  placeholder: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: "text" | "tel" | "email";
  dir?: "rtl" | "ltr";
  autoComplete?: string;
}

function Field({
  id,
  icon,
  placeholder,
  value,
  error,
  onChange,
  type = "text",
  inputMode,
  dir,
  autoComplete,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {placeholder}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 start-3.5 flex items-center text-ink-400">
          {icon}
        </span>
        <input
          id={id}
          name={id}
          type={type}
          inputMode={inputMode}
          dir={dir}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          className={cn(FIELD_CLASS, error && "border-red-500/70 focus:border-red-500")}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}
