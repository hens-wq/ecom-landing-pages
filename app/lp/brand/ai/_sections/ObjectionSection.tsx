"use client";

import { motion } from "motion/react";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { CTAButton } from "@/components/ui/CTAButton";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { aiContent } from "@/content/landing/brand-ai";
import { cn } from "@/lib/utils";

/**
 * Structural clone of Cyber's ObjectionSection. Section background is
 * ai-light instead of paper; the headline, connecting-line gradient, and
 * final step marker deliberately KEEP purple (brand-600) — this is this
 * round's one clearly visible "purple as supporting accent" moment (a
 * single section, not scattered across the page). Everything else
 * follows the same structure/copy/behavior as Cyber.
 */
export function ObjectionSection() {
  const { objection } = aiContent;

  return (
    <section className="bg-ai-light px-5 py-16 sm:px-8 md:px-16 md:py-24">
      <div className="mx-auto max-w-4xl">
        <AnimatedSection effect="fade-up">
          <h2 className="text-display-xl text-balance text-brand-600">{objection.headline}</h2>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-950">{objection.body}</p>
        </AnimatedSection>

        <AnimatedSection effect="scale-in" delay={0.1} className="mt-10">
          <ImagePlaceholder
            aspectRatio="16/8"
            src={objection.imageSrc}
            label="תרגול מעשי — למידה בעבודה"
            description="אדם צעיר עובד על מחשב נייד בסביבת סייבר/הדרכה. יחס רחב, קרופ עדין."
            imagePosition="object-[60%_25%]"
            className="w-full border-ink-200"
          />
        </AnimatedSection>

        <AnimatedSection effect="fade-in" delay={0.15} className="relative mt-10 md:mt-20">
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            style={{ transformOrigin: "right center" }}
            className="absolute inset-x-0 top-[13px] hidden h-px bg-gradient-to-l from-ink-200 via-brand-300 to-brand-600 md:block"
            aria-hidden
          />
          <ol className="flex flex-col gap-6 md:flex-row md:justify-between md:gap-4">
            {objection.steps.map((step, index) => {
              const isLast = index === objection.steps.length - 1;
              return (
                <li key={step} className="flex items-center gap-4 md:flex-col md:items-start md:gap-5">
                  <span
                    className={cn(
                      "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                      isLast
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-ink-300 bg-ai-light text-ink-950",
                    )}
                  >
                    {index + 1}
                  </span>
                  <span
                    className={cn(
                      "text-base md:text-lg",
                      isLast ? "font-bold text-ink-950" : "font-medium text-ink-950",
                    )}
                  >
                    {step}
                  </span>
                </li>
              );
            })}
          </ol>
        </AnimatedSection>

        <AnimatedSection effect="fade-up" delay={0.1} className="mt-12" id="objection-cta">
          <CTAButton href="#lead-form-mid" variant="outline-dark">
            {objection.ctaLabel}
          </CTAButton>
        </AnimatedSection>
      </div>
    </section>
  );
}
