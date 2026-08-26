import { Star } from "lucide-react";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { TrustMetric } from "@/components/ui/TrustMetric";
import { cyberContent } from "@/content/landing/brand-cyber";

/**
 * A light, high-contrast beat between the dark cinematic hero and the
 * next section. One dominant hero stat (87%) plus the two Google-review
 * numbers merged into a single composite proof point (they're the same
 * underlying fact — a rating and a review count) rather than three
 * disconnected figures side by side.
 */
export function TrustBarSection() {
  const { bgSrc, stats } = cyberContent.trustBar;
  const [placement, reviewCount, rating] = stats;

  return (
    <AnimatedSection
      as="section"
      effect="fade-in"
      className="relative overflow-hidden border-b border-ink-200/60 bg-off-white px-5 py-16 sm:px-8 md:px-16 md:py-20"
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

      <div className="relative z-10 mx-auto max-w-3xl">
        <TrustMetric
          value={placement.value}
          decimals={placement.decimals}
          suffix={placement.suffix}
          label={placement.label}
          tone="light"
          size="xl"
          valueClassName="text-brand-600"
        />

        <div className="mt-8 flex items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-ink-200" />
          <span className="size-1.5 rotate-45 bg-brand-500" />
          <span className="size-1.5 rotate-45 bg-teal-400" />
        </div>

        <div className="mt-8 flex items-baseline gap-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-4 fill-teal-500 text-teal-500" aria-hidden />
            ))}
          </div>
          <span className="bidi-plaintext text-2xl font-bold text-ink-950">
            {rating.value.toFixed(rating.decimals)}
            {rating.suffix}
          </span>
        </div>
        <p className="bidi-plaintext mt-1.5 text-base font-medium text-ink-600">
          <span className="font-bold text-ink-950">
            {reviewCount.value}
            {reviewCount.suffix}
          </span>{" "}
          {reviewCount.label}
        </p>
      </div>
    </AnimatedSection>
  );
}
