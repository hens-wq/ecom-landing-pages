"use client";

import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck } from "lucide-react";
import { CTAButton } from "@/components/ui/CTAButton";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { LeadFormFields } from "@/components/forms/LeadFormFields";
import { FormSuccessState } from "@/components/forms/FormSuccessState";
import { useLeadForm } from "@/lib/leads/useLeadForm";
import { cyberContent } from "@/content/landing/brand-cyber";

/**
 * Full-bleed cinematic hero. Deliberately not the generic
 * headline-left/image-right/cards-bottom formula: the photo is the whole
 * section's background, copy is layered over it with a scrim, and the
 * lead form is a docked translucent panel (angled edge on desktop) rather
 * than a floating white card.
 */
export function HeroSection() {
  const { hero } = cyberContent;
  const { values, errors, status, submitError, tracking, updateField, handleSubmit } =
    useLeadForm("brand-cyber");

  return (
    <section className="relative flex flex-col overflow-hidden bg-ink-950 lg:min-h-[94vh] lg:flex-row">
      {/* Mobile + tablet: shorter image band up top, stacked flow below.
          Desktop (lg+): full-bleed behind the asymmetric split — the tighter
          tablet width can't fit a fixed-width side panel without cramping. */}
      <div className="relative h-[46svh] shrink-0 lg:absolute lg:inset-0 lg:h-auto">
        <ImagePlaceholder fill label={hero.image.label} description={hero.image.description} priority />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/10 to-transparent lg:bg-gradient-to-t lg:from-ink-950 lg:via-ink-950/20 lg:to-transparent" />
        <div className="absolute inset-0 hidden bg-gradient-to-l from-ink-950/95 via-ink-950/10 to-transparent lg:block" />
      </div>

      {/* Faint technical overlay lines — a UI/tech motif, not literal chrome */}
      <svg
        className="pointer-events-none absolute inset-0 z-[1] h-full w-full opacity-[0.14]"
        aria-hidden
        preserveAspectRatio="none"
      >
        <line x1="0" y1="30%" x2="100%" y2="22%" stroke="var(--color-teal-400)" strokeWidth="1" />
        <line x1="0" y1="72%" x2="60%" y2="80%" stroke="var(--color-brand-300)" strokeWidth="1" />
        <circle cx="8%" cy="30%" r="3" fill="var(--color-teal-400)" />
        <circle cx="60%" cy="80%" r="3" fill="var(--color-brand-300)" />
      </svg>

      <div className="relative z-10 flex flex-1 flex-col justify-end gap-5 px-5 pb-8 pt-6 sm:px-8 md:px-10 lg:justify-center lg:gap-7 lg:px-16 lg:pb-24 lg:pt-28 lg:pe-[440px] xl:pe-[480px]">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-eyebrow text-brand-300 uppercase"
        >
          {hero.eyebrow}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="text-balance text-off-white"
        >
          <span className="block text-display-xl">{hero.headlineTop}</span>
          <span className="text-display-2xl block">{hero.headlineBottom}</span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex flex-wrap items-center gap-2.5"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-400/40 bg-teal-400/10 px-3.5 py-2 text-sm font-medium text-teal-300">
            <BadgeCheck className="size-4" aria-hidden />
            {hero.noBackgroundHook}
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.22 }}
          className="flex items-baseline gap-2 border-s-2 border-lime-500/60 ps-3"
        >
          <span className="flex flex-col">
            <span className="text-xs text-ink-300">{hero.salaryLabel}</span>
            <span className="bidi-plaintext text-display-lg leading-none font-extrabold text-lime-400">
              {hero.salaryValue}
              <span className="text-display-sm ms-1.5 font-semibold text-lime-300">
                {hero.salarySuffix}
              </span>
            </span>
            <span className="mt-1 text-[11px] text-ink-400">{hero.salaryNote}</span>
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <CTAButton href="#lead-form-hero" size="lg">
            {hero.ctaLabel}
          </CTAButton>
        </motion.div>
      </div>

      {/* Docked form panel: angled glass panel on desktop (lg+), in-flow block on mobile/tablet */}
      <div className="relative z-10 lg:absolute lg:inset-y-0 lg:end-0 lg:flex lg:w-[400px] lg:items-center xl:w-[440px]">
        <div
          id="lead-form-hero"
          className="border-t border-white/10 bg-ink-900/80 px-5 py-8 backdrop-blur-md sm:px-8 md:px-10 lg:w-full lg:border-t-0 lg:border-s lg:border-white/10 lg:py-10 lg:[clip-path:polygon(0%_0%,92%_0%,100%_100%,0%_100%)]"
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
                <p className="text-display-sm text-off-white">{hero.formTitle}</p>
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
                <CTAButton type="submit" fullWidth loading={status === "submitting"}>
                  {hero.ctaLabel}
                </CTAButton>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
