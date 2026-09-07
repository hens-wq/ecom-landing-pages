import { Star } from "lucide-react";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { TrustMetric } from "@/components/ui/TrustMetric";
import { cyberContent } from "@/content/landing/brand-cyber";

/**
 * A light, high-contrast beat between the dark cinematic hero and the
 * next section. 87% runs at campaign-hook scale, centered top; the Google
 * reviews block reads as one clean centered unit below it (a headline
 * sentence, then rating + stars) rather than a second competing stat.
 */
export function TrustBarSection() {
  const { bgSrc, placement, reviews } = cyberContent.trustBar;

  return (
    <AnimatedSection
      as="section"
      effect="fade-in"
      className="relative overflow-hidden border-b border-ink-200/60 bg-off-white px-5 py-12 sm:px-8 md:px-16 md:py-20"
    >
      <ImagePlaceholder
        fill
        src={bgSrc}
        label="רקע טכנולוגי בהיר"
        description="רקע טכנולוגי בהיר/לבנדר לשבירת הקצב הכהה של העמוד."
        sizes="100vw"
        imagePosition="object-[65%_70%]"
      />
      {/* Cinematic seam from the Hero's dark bottom into this light section */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-ink-950 to-transparent" />

      <div className="relative z-10 mx-auto flex max-w-md flex-col items-center text-center">
        <TrustMetric
          value={placement.value}
          decimals={placement.decimals}
          suffix={placement.suffix}
          label={placement.label}
          tone="light"
          size="hero"
          align="center"
          valueClassName="text-brand-600"
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
