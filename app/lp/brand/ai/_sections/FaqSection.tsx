import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { FAQ } from "@/components/ui/FAQ";
import { aiContent } from "@/content/landing/brand-ai";

/**
 * Structural clone of Cyber's FaqSection. Section background is ai-light
 * instead of paper; the FAQ component itself is unchanged (its "light"
 * tone's purple chevron-on-open accent is a small, appropriately-scaled
 * supporting touch, left as-is).
 */
export function FaqSection() {
  return (
    <section id="faq-section" className="border-t border-ink-200/60 bg-ai-light px-5 py-14 sm:px-8 md:px-16">
      <div className="mx-auto max-w-2xl">
        <AnimatedSection effect="fade-up">
          <h2 className="text-display-sm text-ink-950">שאלות שכדאי לענות עליהן מראש</h2>
          <FAQ items={aiContent.faq} tone="light" className="mt-6" />
        </AnimatedSection>
      </div>
    </section>
  );
}
