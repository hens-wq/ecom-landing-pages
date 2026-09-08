import { Star } from "lucide-react";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { TrustMetric } from "@/components/ui/TrustMetric";
import { aiContent } from "@/content/landing/brand-ai";

/**
 * Structural clone of Cyber's TrustBarSection. Section background is
 * ai-light instead of off-white; the 87% campaign-hook stat moves from
 * brand-600 (purple) to teal-600 — it's the single largest piece of text
 * on the page, so it carries the "turquoise is the dominant anchor" rule
 * directly. The reviews rating/stars were already teal in Cyber and are
 * unchanged.
 */
export function TrustBarSection() {
  const { bgSrc, placement, reviews } = aiContent.trustBar;

  return (
    <AnimatedSection
      as="section"
      effect="fade-in"
      className="relative overflow-hidden border-b border-ink-200/60 bg-ai-light px-5 py-12 sm:px-8 md:px-16 md:py-20"
    >
      <ImagePlaceholder
        fill
        src={bgSrc}
        label="רקע טכנולוגי בהיר"
        description="רקע טכנולוגי בהיר/לבנדר לשבירת הקצב הכהה של העמוד."
        sizes="100vw"
        imagePosition="object-[65%_70%]"
      />
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-ai-dark to-transparent" />

      <div className="relative z-10 mx-auto flex max-w-md flex-col items-center text-center">
        <TrustMetric
          value={placement.value}
          decimals={placement.decimals}
          suffix={placement.suffix}
          label={placement.label}
          tone="light"
          size="hero"
          align="center"
          valueClassName="text-teal-600"
          labelClassName="text-lg sm:text-xl"
        />

        <div className="mt-7 mb-7 h-px w-full bg-ink-950/10" aria-hidden />

        <p className="max-w-xs text-xl font-bold text-ink-950 sm:text-2xl">{reviews.headline}</p>
        <div className="mt-3 flex items-center gap-2.5">
          <span className="bidi-plaintext text-2xl font-extrabold text-teal-600 sm:text-3xl">
            {reviews.rating.value.toFixed(reviews.rating.decimals)}
            {reviews.rating.suffix}
          </span>
          <div className="flex items-center gap-1" aria-hidden>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-5 fill-teal-500 text-teal-500" aria-hidden />
            ))}
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}
