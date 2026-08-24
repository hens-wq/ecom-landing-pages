import type { Metadata } from "next";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { CTAButton } from "@/components/ui/CTAButton";
import { TrustMetric } from "@/components/ui/TrustMetric";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { FAQ } from "@/components/ui/FAQ";
import { StickyMobileCTA } from "@/components/ui/StickyMobileCTA";
import { LeadForm } from "@/components/forms/LeadForm";
import { cyberContent } from "@/content/landing/brand-cyber";

export const metadata: Metadata = {
  title: "הכשרת סייבר",
};

// SCAFFOLD PAGE — proves the foundation (theme, RTL, motion, lead form,
// tracking) works end-to-end with real components. The final art
// direction, section design and copy will replace this once the Cyber
// landing-page brief is provided.
export default function BrandCyberPage() {
  const { eyebrow, headline, subheadline, primaryCta, hero, stats, faq } = cyberContent;

  return (
    <main className="overflow-x-hidden pb-24 md:pb-0">
      <section className="relative flex flex-col gap-8 px-5 pb-12 pt-14 sm:px-8 md:flex-row md:items-center md:gap-12 md:px-16 md:pb-24 md:pt-24">
        <AnimatedSection effect="fade-up" className="flex-1 md:max-w-xl">
          <p className="text-eyebrow text-brand-400 uppercase">{eyebrow}</p>
          <h1 className="text-display-2xl mt-4 text-balance text-off-white">{headline}</h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-300">{subheadline}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <CTAButton href="#lead-form" size="lg">
              {primaryCta}
            </CTAButton>
          </div>
        </AnimatedSection>

        <AnimatedSection effect="scale-in" delay={0.1} className="flex-1">
          <ImagePlaceholder
            aspectRatio={hero.aspectMobile}
            label={hero.label}
            description={hero.description}
            className="w-full md:hidden"
          />
          <ImagePlaceholder
            aspectRatio={hero.aspectDesktop}
            label={hero.label}
            description={hero.description}
            className="hidden w-full md:block"
          />
        </AnimatedSection>
      </section>

      <AnimatedSection
        effect="fade-in"
        as="section"
        className="border-y border-white/10 bg-ink-900/60 px-5 py-10 sm:px-8 md:px-16"
      >
        <div className="flex flex-wrap justify-between gap-8">
          {stats.map((stat) => (
            <TrustMetric
              key={stat.label}
              value={stat.value}
              decimals={stat.decimals}
              suffix={stat.suffix}
              label={stat.label}
            />
          ))}
        </div>
      </AnimatedSection>

      <AnimatedSection as="section" className="px-5 py-16 sm:px-8 md:px-16">
        <LeadForm landingPageId="brand-cyber" className="mx-auto max-w-md" />
      </AnimatedSection>

      <AnimatedSection as="section" className="px-5 py-16 sm:px-8 md:px-16">
        <h2 className="text-display-md text-off-white">שאלות נפוצות</h2>
        <FAQ items={faq} className="mt-6" />
      </AnimatedSection>

      <StickyMobileCTA label={primaryCta} href="#lead-form" />
    </main>
  );
}
