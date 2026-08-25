import { Star } from "lucide-react";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { TrustMetric } from "@/components/ui/TrustMetric";
import { cyberContent } from "@/content/landing/brand-cyber";

/**
 * A light, high-contrast beat between the dark cinematic hero and the
 * next section — one oversized hero stat plus a secondary composite
 * review signal, not three identical stat cards. The light tech texture
 * is the page's first deliberate break from the dark rhythm.
 */
export function TrustBarSection() {
  const { bgSrc, stats } = cyberContent.trustBar;
  const [placement, reviewCount, rating] = stats;

  return (
    <AnimatedSection
      as="section"
      effect="fade-in"
      className="relative overflow-hidden border-y border-ink-200/60 bg-off-white px-5 py-14 sm:px-8 md:px-16 md:py-20"
    >
      <ImagePlaceholder
        fill
        src={bgSrc}
        label="רקע טכנולוגי בהיר"
        description="רקע טכנולוגי בהיר/לבנדר לשבירת הקצב הכהה של העמוד."
        sizes="100vw"
      />

      <div className="relative z-10 flex flex-col gap-10 md:flex-row md:items-center md:gap-16">
        <div className="md:flex-1">
          <TrustMetric
            value={placement.value}
            decimals={placement.decimals}
            suffix={placement.suffix}
            label={placement.label}
            tone="light"
            size="xl"
          />
        </div>

        <div className="h-px w-full bg-ink-200 md:h-20 md:w-px" />

        <div className="flex flex-col gap-3 md:flex-1">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-4 fill-brand-500 text-brand-500" aria-hidden />
            ))}
            <span className="bidi-plaintext ms-1 text-lg font-bold text-ink-950">
              {rating.value.toFixed(rating.decimals)}
              {rating.suffix}
            </span>
          </div>
          <TrustMetric
            value={reviewCount.value}
            decimals={reviewCount.decimals}
            suffix={reviewCount.suffix}
            label={reviewCount.label}
            tone="light"
            size="md"
          />
        </div>
      </div>
    </AnimatedSection>
  );
}
