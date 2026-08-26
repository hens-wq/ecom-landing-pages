import { Star } from "lucide-react";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { TrustMetric } from "@/components/ui/TrustMetric";
import { cyberContent } from "@/content/landing/brand-cyber";

/**
 * A light, high-contrast beat between the dark cinematic hero and the
 * next section. Three independent proof points, each given the same
 * large, dominant number treatment and separated by simple dividers —
 * deliberately not merged into a single composite sentence, and
 * deliberately not three boxed/rounded cards.
 */
export function TrustBarSection() {
  const { bgSrc, stats } = cyberContent.trustBar;
  const [placement, reviewCount, rating] = stats;

  return (
    <AnimatedSection
      as="section"
      effect="fade-in"
      className="relative overflow-hidden border-b border-ink-200/60 bg-off-white px-5 py-14 sm:px-8 md:px-16 md:py-20"
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

      <div className="relative z-10 mx-auto flex max-w-md flex-col divide-y divide-ink-950/10">
        <div className="pb-6">
          <TrustMetric
            value={placement.value}
            decimals={placement.decimals}
            suffix={placement.suffix}
            label={placement.label}
            tone="light"
            size="xl"
            valueClassName="text-brand-600"
          />
        </div>

        <div className="py-6">
          <TrustMetric
            value={reviewCount.value}
            decimals={reviewCount.decimals}
            suffix={reviewCount.suffix}
            label={reviewCount.label}
            tone="light"
            size="xl"
            valueClassName="text-ink-950"
          />
        </div>

        <div className="pt-6">
          <TrustMetric
            value={rating.value}
            decimals={rating.decimals}
            suffix={rating.suffix}
            label={rating.label}
            tone="light"
            size="xl"
            valueClassName="text-teal-600"
          />
          <div className="mt-2.5 flex items-center gap-1" aria-hidden>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-4 fill-teal-500 text-teal-500" aria-hidden />
            ))}
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}
