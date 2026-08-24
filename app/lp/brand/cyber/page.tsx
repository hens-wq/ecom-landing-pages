import type { Metadata } from "next";
import { StickyMobileCTA } from "@/components/ui/StickyMobileCTA";
import { cyberContent } from "@/content/landing/brand-cyber";
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
  title: "קורס Cyber ב-10 חודשים",
  description: "קורס Cyber ב-10 חודשים, ללא צורך ברקע קודם. בדיקת התאמה קצרה וללא עלות.",
};

export default function BrandCyberPage() {
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
        label={cyberContent.hero.ctaLabel}
        href="#lead-form-hero"
        hideWhenVisible={["#lead-form-hero", "#lead-form-mid", "#lead-form-final"]}
      />
    </main>
  );
}
