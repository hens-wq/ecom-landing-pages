import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { FAQ } from "@/components/ui/FAQ";
import { cyberContent } from "@/content/landing/brand-cyber";

export function FaqSection() {
  return (
    <section className="border-t border-ink-200/60 bg-paper px-5 py-14 sm:px-8 md:px-16">
      <div className="mx-auto max-w-2xl">
        <AnimatedSection effect="fade-up">
          <h2 className="text-display-sm text-ink-950">שאלות שכדאי לענות עליהן מראש</h2>
          <FAQ items={cyberContent.faq} tone="light" className="mt-6" />
        </AnimatedSection>
      </div>
    </section>
  );
}
