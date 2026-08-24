import { TrendingUp } from "lucide-react";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { cyberContent } from "@/content/landing/brand-cyber";

/**
 * Career/placement objection. The 5-step progression climbs as a
 * staircase (desktop) rather than repeating the objection section's
 * horizontal path — same brand language, different shape.
 */
export function CareerSection() {
  const { career } = cyberContent;

  return (
    <section className="bg-paper px-5 py-16 sm:px-8 md:px-16 md:py-24">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 md:flex-row md:items-center md:gap-16">
        <AnimatedSection effect="slide-end" className="md:order-2 md:w-[38%] md:shrink-0">
          <ImagePlaceholder
            aspectRatio="4/5"
            label={career.visual.label}
            description={career.visual.description}
            className="w-full border-ink-200"
          />
        </AnimatedSection>

        <div className="md:order-1 md:flex-1">
          <AnimatedSection effect="fade-up">
            <h2 className="text-balance text-ink-950">
              <span className="text-display-md block font-medium text-ink-400">
                {career.headlineTop}
              </span>
              <span className="text-display-xl block text-ink-950">{career.headlineBottom}</span>
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-500">{career.body}</p>
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
                      : "flex size-9 items-center justify-center rounded-full border border-ink-300 text-xs font-bold text-ink-500"
                  }
                >
                  {index + 1}
                </span>
                <span className="max-w-[6.5rem] text-center text-xs font-medium text-ink-600">
                  {step}
                </span>
              </div>
            ))}
            <TrendingUp className="mb-2 size-6 text-lime-600" aria-hidden />
          </AnimatedSection>

          {/* Mobile: vertical connected list */}
          <ol className="mt-10 flex flex-col gap-0 border-s-2 border-ink-200 ps-4 md:hidden">
            {career.steps.map((step, index) => (
              <li key={step} className="relative pb-6 last:pb-0">
                <span
                  className={
                    index === career.steps.length - 1
                      ? "absolute -start-[21px] top-0 flex size-4 items-center justify-center rounded-full bg-brand-600"
                      : "absolute -start-[21px] top-0 flex size-4 items-center justify-center rounded-full border-2 border-ink-300 bg-paper"
                  }
                  aria-hidden
                />
                <span className="text-sm font-medium text-ink-700">{step}</span>
              </li>
            ))}
          </ol>

          <AnimatedSection effect="fade-up" delay={0.25} className="mt-10 space-y-2">
            <p className="text-xs font-medium tracking-wide text-ink-400 uppercase">
              {career.rolesLabel}
            </p>
            <div className="flex flex-wrap gap-2">
              {career.roles.map((role) => (
                <span
                  key={role}
                  className="bidi-plaintext rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-sm font-medium text-ink-700"
                >
                  {role}
                </span>
              ))}
            </div>
            <p className="pt-2 text-sm text-ink-400">{career.supportNote}</p>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
