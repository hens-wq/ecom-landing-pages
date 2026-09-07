"use client";

import Image from "next/image";
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
    <section className="relative flex flex-col overflow-hidden bg-ink-950 lg:flex-row lg:min-h-[94vh]">
      {/* Mobile + tablet: the photo is a true background (absolute, out of
          flow) so the copy below can overlap its lower half instead of
          starting fresh after a separate image block — one composition,
          not an image slab stacked on top of the offer.
          Desktop (lg+): full-bleed behind the asymmetric split. */}
      <div className="absolute inset-x-0 top-0 h-[54svh] lg:inset-0 lg:h-auto">
        <ImagePlaceholder
          fill
          src={hero.image.src}
          label={hero.image.label}
          description={hero.image.description}
          priority
          sizes="100vw"
          imagePosition="object-[32%_40%] lg:object-[55%_35%]"
        />
        {/* Light enough that the subject and monitors stay clearly visible —
            solid only right at the very bottom edge (seamless blend into
            the content below), a soft mid tint through the headline zone,
            fully clear again toward the top of the frame. */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 from-[4%] via-ink-950/45 via-[42%] to-transparent to-[75%] lg:hidden" />
        <div className="absolute inset-0 hidden bg-gradient-to-t from-ink-950/70 via-ink-950/10 to-transparent lg:block" />
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

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute top-4 start-5 z-20 sm:top-5 sm:start-8 md:start-10"
      >
        <Image
          src={hero.logo.src}
          alt={hero.logo.alt}
          width={140}
          height={108}
          priority
          className="h-8 w-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] sm:h-10"
        />
      </motion.div>

      <div
        className="relative z-10 flex flex-1 flex-col gap-4 px-5 pt-[27svh] pb-6 sm:px-8 sm:pt-[24svh] md:px-10 lg:justify-center lg:gap-7 lg:px-16 lg:pt-28 lg:pb-24 lg:pe-[440px] xl:pe-[480px]"
        style={{ textShadow: "0 2px 14px rgba(0,0,0,0.55)" }}
      >
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="text-balance text-off-white"
        >
          <span className="block text-display-lg">{hero.headlineTop}</span>
          <span className="text-display-2xl mt-0.5 block">{hero.headlineBottom}</span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex flex-wrap items-center gap-2.5"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-400/40 bg-teal-400/10 px-3.5 py-2 text-base font-medium text-teal-300">
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
            <span className="text-[15px] font-medium text-ink-200">{hero.salaryLabel}</span>
            <span className="bidi-plaintext text-display-xl leading-none font-extrabold text-lime-400">
              {hero.salaryValue}
              <span className="text-display-sm ms-1.5 font-semibold text-lime-300">
                {hero.salarySuffix}
              </span>
            </span>
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
