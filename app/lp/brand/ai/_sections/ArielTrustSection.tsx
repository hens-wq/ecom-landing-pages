import Image from "next/image";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { aiContent } from "@/content/landing/brand-ai";

/**
 * Structural clone of Cyber's ArielTrustSection — see that file for the
 * wording-scope note (pedagogical supervision only). Only the section
 * background token changes (ai-dark instead of ink-900); the Ariel logo
 * file itself is the same shared asset, unchanged.
 */
export function ArielTrustSection() {
  const { ariel } = aiContent;

  return (
    <section className="relative overflow-hidden border-b border-white/5 bg-ai-dark px-5 py-16 sm:px-8 md:px-16 md:py-24">
      <ImagePlaceholder
        fill
        src={ariel.bgSrc}
        label="מרקם טכנולוגי כהה"
        description="רקע טכנולוגי כהה מופשט — טקסטורה בלבד, לא תמונת תוכן."
        sizes="100vw"
        className="opacity-70"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ai-dark/40 via-ai-dark/70 to-ai-dark" />

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-7 text-center">
        <AnimatedSection effect="scale-in">
          <Image
            src={ariel.logo.src}
            alt={ariel.logo.alt}
            width={1774}
            height={887}
            className="h-28 w-auto sm:h-32"
          />
        </AnimatedSection>

        <AnimatedSection effect="fade-up">
          <p className="text-display-sm max-w-xl text-balance text-off-white">{ariel.statement}</p>
        </AnimatedSection>
      </div>
    </section>
  );
}
