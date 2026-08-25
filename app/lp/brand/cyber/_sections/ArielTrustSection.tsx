import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { cyberContent } from "@/content/landing/brand-cyber";

/**
 * A restrained, prestige-toned credibility section — one sentence, not a
 * paragraph of legal text. Wording here is deliberately scoped to
 * pedagogical supervision only; do not expand it toward "academic
 * institution," a degree, or a jointly issued certificate.
 */
export function ArielTrustSection() {
  const { ariel } = cyberContent;

  return (
    <section className="relative overflow-hidden border-b border-white/5 bg-ink-900 px-5 py-16 sm:px-8 md:px-16 md:py-24">
      <ImagePlaceholder
        fill
        src={ariel.bgSrc}
        label="מרקם טכנולוגי כהה"
        description="רקע טכנולוגי כהה מופשט — טקסטורה בלבד, לא תמונת תוכן."
        sizes="100vw"
        className="opacity-70"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ink-900/40 via-ink-900/70 to-ink-900" />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center gap-8 text-center md:flex-row md:items-center md:gap-14 md:text-start">
        <AnimatedSection effect="scale-in" className="shrink-0">
          <ImagePlaceholder
            aspectRatio="16/9"
            label={ariel.logo.label}
            description={ariel.logo.description}
            className="w-56 border-white/10 bg-[linear-gradient(135deg,var(--color-ink-800),var(--color-ink-950))] sm:w-64"
          />
        </AnimatedSection>

        <AnimatedSection effect="fade-up" className="flex flex-1 flex-col items-center gap-3 md:items-start">
          <span className="h-px w-10 bg-teal-400/60" aria-hidden />
          <p className="text-eyebrow text-teal-300 uppercase">{ariel.eyebrow}</p>
          <p className="text-display-sm max-w-xl text-balance text-off-white">{ariel.statement}</p>
        </AnimatedSection>
      </div>
    </section>
  );
}
