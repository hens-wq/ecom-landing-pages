"use client";

import { AnimatePresence, motion } from "motion/react";
import { CTAButton } from "@/components/ui/CTAButton";
import { FormSuccessState } from "@/components/forms/FormSuccessState";
import { LeadFormFields } from "@/components/forms/LeadFormFields";
import { useLeadForm } from "@/lib/leads/useLeadForm";
import type { LandingPageId } from "@/lib/types";
import { cn } from "@/lib/utils";

interface LeadFormProps {
  id?: string;
  landingPageId: LandingPageId;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  variant?: "card" | "flush";
  className?: string;
}

/**
 * Default, self-contained lead form: a dark card with title/subtitle,
 * fields and CTA. Good fit for a straightforward page. A page that needs
 * several forms with genuinely different compositions (see the Cyber
 * page's hero/mid/final forms) should compose useLeadForm + LeadFormFields
 * directly instead of forcing them all through this one look.
 */
export function LeadForm({
  id = "lead-form",
  landingPageId,
  title = "השאירו פרטים ונחזור אליכם",
  subtitle,
  ctaLabel = "לקבלת פרטים",
  variant = "card",
  className,
}: LeadFormProps) {
  const { values, errors, status, submitError, tracking, updateField, handleSubmit } =
    useLeadForm(landingPageId);

  return (
    <div
      id={id}
      className={cn(
        variant === "card" && "border border-white/10 bg-ink-800/60 p-6 backdrop-blur-sm sm:p-8",
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
                {subtitle && <p className="text-sm text-ink-200">{subtitle}</p>}
              </div>
            )}

            <LeadFormFields
              values={values}
              errors={errors}
              tracking={tracking}
              onChange={updateField}
              tone="glass"
            />

            {submitError && (
              <p role="alert" className="text-sm text-red-400">
                {submitError}
              </p>
            )}

            <CTAButton type="submit" fullWidth loading={status === "submitting"} className="mt-1">
              {ctaLabel}
            </CTAButton>

            <p className="text-center text-xs text-ink-200">
              בשליחת הפרטים אני מאשר/ת יצירת קשר בנוגע לתוכן שביקשתי.
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
