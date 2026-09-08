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
 * Structural clone of Cyber's FinalSection. Section background is ai-dark
 * instead of ink-950 (including the vignette radial, kept in sync so the
 * photo blends the same way). The two accent radial glows keep both
 * purple and teal — matching what the actual final-room photo itself
 * shows (a teal ceiling ring + ambient purple lighting) — but re-weighted
 * slightly toward teal so it reads as the dominant tone.
 */
export function FinalSection() {
  const { final } = aiContent;
  const { values, errors, status, submitError, tracking, updateField, handleSubmit } =
    useLeadForm("brand-ai");

  return (
    <section className="relative overflow-hidden bg-ai-dark px-5 py-20 sm:px-8 md:px-16 md:py-28">
      <ImagePlaceholder
        fill
        src={final.bgSrc}
        label="חדר SOC ריק — פרימיום"
        description="חדר בקרה/SOC ריק ומפואר — רקע קולנועי לסקשן ההמרה הסופי."
        sizes="100vw"
        imagePosition="object-[42%_50%]"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(65% 60% at 50% 42%, color-mix(in oklab, var(--color-ai-dark) 82%, transparent) 35%, transparent 90%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 55% at 50% 35%, color-mix(in oklab, var(--color-brand-600) 22%, transparent), transparent)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.6]"
        style={{
          background:
            "radial-gradient(38% 40% at 78% 78%, color-mix(in oklab, var(--color-teal-500) 30%, transparent), transparent)",
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-lg text-center">
        <AnimatedSection effect="fade-up">
          <h2 className="text-display-xl text-balance text-off-white">{final.headline}</h2>
          <p className="mt-4 text-xl font-medium text-ink-200">{final.subheadline}</p>
        </AnimatedSection>

        <AnimatedSection effect="fade-up" delay={0.15} className="mt-10">
          <div id="lead-form-final">
            <AnimatePresence mode="wait">
              {status === "success" ? (
                <FormSuccessState key="success" />
              ) : (
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  noValidate
                  className="flex flex-col gap-5"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <LeadFormFields
                    values={values}
                    errors={errors}
                    tracking={tracking}
                    onChange={updateField}
                    tone="underline"
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
                    accent="teal"
                    className="mt-2"
                  >
                    {final.ctaLabel}
                  </CTAButton>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
