"use client";

import { AnimatePresence, motion } from "motion/react";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { CTAButton } from "@/components/ui/CTAButton";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { FormSuccessState } from "@/components/forms/FormSuccessState";
import { LeadFormFields } from "@/components/forms/LeadFormFields";
import { useLeadForm } from "@/lib/leads/useLeadForm";
import { cyberContent } from "@/content/landing/brand-cyber";

/**
 * Second conversion opportunity. Intentionally a bold purple photo
 * background with solid white fields — the opposite of the hero's dark
 * glass panel — so the two forms don't read as the same block repeated.
 */
export function MidFormSection() {
  const { midForm } = cyberContent;
  const { values, errors, status, submitError, tracking, updateField, handleSubmit } =
    useLeadForm("brand-cyber");

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(155deg,var(--color-brand-700),var(--color-brand-900)_55%,var(--color-ink-950))] px-5 py-16 sm:px-8 md:px-16 md:py-24">
      <ImagePlaceholder
        fill
        src={midForm.bgSrc}
        label="רקע איקום סגול"
        description="רקע מופשט סגול-איקום עשיר לסקשן ההמרה האמצעי."
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-ink-950/15" />
      <div
        className="pointer-events-none absolute -end-24 -top-24 size-[380px] rounded-full bg-teal-400/20 blur-[100px]"
        aria-hidden
      />

      <div id="lead-form-mid" className="relative mx-auto max-w-lg text-center">
        <AnimatedSection effect="fade-up">
          <h2 className="text-display-lg text-balance text-white">{midForm.headline}</h2>
          <p className="mt-3 text-xl font-medium text-brand-100">{midForm.subheadline}</p>
        </AnimatedSection>

        <AnimatedSection effect="fade-up" delay={0.15} className="mt-8">
          <AnimatePresence mode="wait">
            {status === "success" ? (
              <FormSuccessState key="success" />
            ) : (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                noValidate
                className="flex flex-col gap-3.5"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <LeadFormFields
                  values={values}
                  errors={errors}
                  tracking={tracking}
                  onChange={updateField}
                  tone="solid"
                />
                {submitError && (
                  <p role="alert" className="text-sm text-lime-200">
                    {submitError}
                  </p>
                )}
                <CTAButton
                  type="submit"
                  variant="secondary"
                  fullWidth
                  loading={status === "submitting"}
                  className="mt-1"
                >
                  {midForm.ctaLabel}
                </CTAButton>
              </motion.form>
            )}
          </AnimatePresence>
        </AnimatedSection>
      </div>
    </section>
  );
}
