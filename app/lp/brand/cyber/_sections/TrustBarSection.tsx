import { Star } from "lucide-react";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { TrustMetric } from "@/components/ui/TrustMetric";
import { cyberContent } from "@/content/landing/brand-cyber";

/**
 * A light, high-contrast beat between the dark cinematic hero and the
 * next section. The 87% figure runs at campaign-hook scale (bigger than
 * any headline on the page) so the numbers read before their labels do;
 * 300+ and the rating sit beside each other as a large secondary pair
 * rather than getting buried in a sentence or a boxed card.
 */
export function TrustBarSection() {
  const { bgSrc, stats } = cyberContent.trustBar;
  const [placement, reviewCount, rating] = stats;

  return (
    <AnimatedSection
      as="section"
      effect="fade-in"
      className="relative overflow-hidden border-b border-ink-200/60 bg-off-white px-5 py-10 sm:px-8 md:px-16 md:py-20"
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

      <div className="relative z-10 mx-auto max-w-md">
        <TrustMetric
          value={placement.value}
          decimals={placement.decimals}
          suffix={placement.suffix}
          label={placement.label}
          tone="light"
          size="hero"
          valueClassName="text-brand-600"
        />

        <div className="mt-5 mb-5 h-px bg-ink-950/10" aria-hidden />

        <div className="grid grid-cols-2 gap-5">
          <TrustMetric
            value={reviewCount.value}
            decimals={reviewCount.decimals}
            suffix={reviewCount.suffix}
            label={reviewCount.label}
            tone="light"
            size="xl"
            valueClassName="text-ink-950"
          />

          <div>
            <TrustMetric
              value={rating.value}
              decimals={rating.decimals}
              suffix={rating.suffix}
              label={rating.label}
              tone="light"
              size="xl"
              valueClassName="text-teal-600"
            />
            <div className="mt-1.5 flex items-center gap-1" aria-hidden>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-3.5 fill-teal-500 text-teal-500" aria-hidden />
              ))}
            </div>
          </div>
        </div>
      </div>
    </AnimatedSection>
  );
}
