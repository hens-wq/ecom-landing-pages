"use client";

import { AnimatePresence, motion } from "motion/react";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { CTAButton } from "@/components/ui/CTAButton";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { FormSuccessState } from "@/components/forms/FormSuccessState";
import { LeadFormFields } from "@/components/forms/LeadFormFields";
import { useLeadForm } from "@/lib/leads/useLeadForm";
import { aiContent } from "@/content/landing/brand-ai";

/**
 * Structural clone of Cyber's MidFormSection. Cyber's version is a bold
 * full-purple gradient (brand-700 -> brand-900 -> ink-950) — the one
 * place in the whole page built around purple as its base, which would
 * read as purple dominating a whole section. Re-based here on
 * teal-700 -> ai-plum -> ai-dark instead: turquoise leads, the "occasional
 * deep plum" background gets its one real use, and the new bg photo
 * (03-ai-bg-accent) is itself a turquoise-to-purple-to-lime abstract, so
 * the purple/lime accents still show through the image without the CSS
 * base being purple. Subheadline color follows (brand-100 -> teal-100).
 */
export function MidFormSection() {
  const { midForm } = aiContent;
  const { values, errors, status, submitError, tracking, updateField, handleSubmit } =
    useLeadForm("brand-ai");

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(155deg,var(--color-teal-700),var(--color-ai-plum)_55%,var(--color-ai-dark))] px-5 py-16 sm:px-8 md:px-16 md:py-24">
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
          <p className="mt-3 text-xl font-medium text-teal-100">{midForm.subheadline}</p>
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
