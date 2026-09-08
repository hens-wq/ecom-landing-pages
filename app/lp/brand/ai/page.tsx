import type { Metadata } from "next";
import { StickyMobileCTA } from "@/components/ui/StickyMobileCTA";
import { aiContent } from "@/content/landing/brand-ai";
import { HeroSection } from "./_sections/HeroSection";
import { TrustBarSection } from "./_sections/TrustBarSection";
import { ArielTrustSection } from "./_sections/ArielTrustSection";
import { ObjectionSection } from "./_sections/ObjectionSection";
import { CyberExperienceSection } from "./_sections/CyberExperienceSection";
import { MidFormSection } from "./_sections/MidFormSection";
import { CareerSection } from "./_sections/CareerSection";
import { FaqSection } from "./_sections/FaqSection";
import { FinalSection } from "./_sections/FinalSection";

export const metadata: Metadata = {
  title: "קורס AI למפתחים",
  description: "קורס AI למפתחים, ללא צורך ברקע קודם. בדיקת התאמה קצרה וללא עלות.",
};

export default function BrandAiPage() {
  return (
    <main className="overflow-x-hidden pb-20 md:pb-0">
      <HeroSection />
      <TrustBarSection />
      <ArielTrustSection />
      <ObjectionSection />
      <CyberExperienceSection />
      <MidFormSection />
      <CareerSection />
      <FaqSection />
      <FinalSection />

      <StickyMobileCTA
        label={aiContent.hero.ctaLabel}
        href="#lead-form-hero"
        accent="teal"
        hideWhenVisible={[
          "#lead-form-hero",
          "#lead-form-mid",
          "#lead-form-final",
          "#objection-cta",
          "#career-section",
          "#faq-section",
        ]}
      />
    </main>
  );
}
