import { Check, TrendingUp } from "lucide-react";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { aiContent } from "@/content/landing/brand-ai";

/**
 * Structural clone of Cyber's CareerSection. Section background is
 * ai-light instead of paper. The eyebrow label and the last staircase/list
 * marker keep purple (brand-600) — small, low-weight instances that echo
 * the Objection section's supporting-accent use of purple without adding
 * another full-purple block.
 */
export function CareerSection() {
  const { career } = aiContent;

  return (
    <section id="career-section" className="bg-ai-light">
      <div className="relative">
        <ImagePlaceholder
          aspectRatio="16/7"
          src={career.transitionSrc}
          label="מעבר — צוות סייבר"
          description="צוות מקצועי עובד יחד סביב מערכות סייבר — רצועה רחבה למעבר בין למידה לקריירה."
          imagePosition="object-[50%_32%]"
          sizes="100vw"
          className="w-full"
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-ai-light" />
      </div>

      <div className="px-5 py-12 sm:px-8 md:px-16 md:py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-9 md:flex-row md:items-center md:gap-16">
          <AnimatedSection effect="slide-end" className="md:order-2 md:w-[38%] md:shrink-0">
            <ImagePlaceholder
              src={career.visual.src}
              label={career.visual.label}
              description={career.visual.description}
              imagePosition="object-[62%_22%]"
              sizes="(min-width: 768px) 38vw, 100vw"
              className="aspect-square w-full border-ink-200 md:aspect-[4/5]"
            />
          </AnimatedSection>

          <div className="md:order-1 md:flex-1">
            <AnimatedSection effect="fade-up">
              <p className="text-eyebrow text-brand-600 uppercase">{career.eyebrow}</p>
              <h2 className="text-display-xl mt-2 text-balance text-ink-950">{career.headline}</h2>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-950">{career.body}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {career.benefits.map((benefit) => (
                  <span
                    key={benefit}
                    className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3.5 py-2 text-[15px] font-semibold text-ink-950"
                  >
                    <Check className="size-4 text-lime-600" aria-hidden />
                    {benefit}
                  </span>
                ))}
              </div>
            </AnimatedSection>

            {/* Desktop: ascending staircase */}
            <AnimatedSection
              effect="fade-in"
              delay={0.15}
              className="mt-12 hidden items-end gap-3 md:flex"
            >
              {career.steps.map((step, index) => (
                <div
                  key={step}
                  className="flex flex-col items-center gap-2"
                  style={{ marginBottom: index * 16 }}
                >
                  <span
                    className={
                      index === career.steps.length - 1
                        ? "flex size-9 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white"
                        : "flex size-9 items-center justify-center rounded-full border border-ink-300 text-xs font-bold text-ink-950"
                    }
                  >
                    {index + 1}
                  </span>
                  <span className="max-w-[6.5rem] text-center text-xs font-medium text-ink-950">
                    {step}
                  </span>
                </div>
              ))}
              <TrendingUp className="mb-2 size-6 text-lime-600" aria-hidden />
            </AnimatedSection>

            {/* Mobile: vertical connected list */}
            <ol className="mt-8 flex flex-col gap-0 border-s-2 border-ink-200 ps-4 md:hidden">
              {career.steps.map((step, index) => (
                <li key={step} className="relative pb-4 last:pb-0">
                  <span
                    className={
                      index === career.steps.length - 1
                        ? "absolute -start-[21px] top-0 flex size-4 items-center justify-center rounded-full bg-brand-600"
                        : "absolute -start-[21px] top-0 flex size-4 items-center justify-center rounded-full border-2 border-ink-300 bg-ai-light"
                    }
                    aria-hidden
                  />
                  <span className="text-base font-medium text-ink-950">{step}</span>
                </li>
              ))}
            </ol>

            <AnimatedSection effect="fade-up" delay={0.25} className="mt-8 space-y-2">
              <p className="text-[15px] font-medium tracking-wide text-ink-950 uppercase">
                {career.rolesLabel}
              </p>
              <div className="flex flex-wrap gap-2">
                {career.roles.map((role) => (
                  <span
                    key={role}
                    className="bidi-plaintext rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-[15px] font-medium text-ink-950"
                  >
                    {role}
                  </span>
                ))}
              </div>
              <p className="pt-2 text-[15px] text-ink-950">{career.supportNote}</p>
            </AnimatedSection>
          </div>
        </div>
      </div>
    </section>
  );
}
