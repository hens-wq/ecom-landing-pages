"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import type { IntroIndustryContent, IntroStatsContent, IntroStudentsContent } from "@/lib/content/schemas";
import { SectionNav } from "@/components/ecom-intro/SectionNav";
import { BrandBackdrop } from "@/components/ecom-intro/BrandBackdrop";
import { StudentPhoto } from "@/components/ecom-intro/StudentPhoto";
import { AnimatedCounter } from "@/components/ecom-intro/AnimatedCounter";
import { GoogleLogo } from "@/components/ecom-intro/GoogleLogo";
import { HighlightEcom } from "@/components/ecom-intro/HighlightEcom";
import { DotGrid, FilledTriangle, FlowLines, OutlineTriangle } from "@/components/shared/GeometricDecor";
import { cn } from "@/lib/utils";

const CARD_ACCENTS = [
  "from-[var(--brand-teal)] to-[var(--brand-green)]",
  "from-[var(--brand-green)] to-[var(--brand-purple)]",
  "from-[var(--brand-purple)] to-[var(--brand-teal)]",
];

const PARTNER_LOGO_NAMES = ["Microsoft", "Check Point", "Deloitte", "EY", "Wix"];

/** Own scatter for this screen - same decorative vocabulary as Welcome/Industry/Ariel, different composition. */
const TRIANGLES = [
  { kind: "outline", size: 190, pos: "-right-16 -top-14", opacity: 0.4, rotate: 8, color: "text-[var(--brand-purple)]" },
  { kind: "outline", size: 30, pos: "left-[15%] top-[7%]", opacity: 0.28, rotate: -12, color: "text-slate-400" },
  { kind: "filled", size: 16, pos: "left-[5%] top-[15%]", opacity: 0.7, rotate: -20, color: "text-[var(--brand-purple)]" },
  { kind: "filled", size: 18, pos: "right-[3%] top-[44%]", opacity: 0.5, rotate: 90, color: "text-[var(--brand-purple)]" },
  { kind: "filled", size: 16, pos: "right-[16%] top-[66%]", opacity: 0.55, rotate: 90, color: "text-[var(--brand-green)]" },
] as const;

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="relative flex gap-0.5" dir="ltr" aria-hidden>
      <div className="flex gap-0.5 text-slate-200">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="size-3.5" fill="currentColor" />
        ))}
      </div>
      <div
        className="absolute inset-0 flex gap-0.5 overflow-hidden text-amber-400"
        style={{ width: `${(rating / 5) * 100}%` }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="size-3.5 shrink-0" fill="currentColor" />
        ))}
      </div>
    </div>
  );
}

export function StatsSection({
  content,
  industry,
  students,
  onNext,
  onPrev,
}: {
  content: IntroStatsContent;
  industry: IntroIndustryContent;
  students: IntroStudentsContent;
  onNext: () => void;
  onPrev: () => void;
}) {
  const [hero, ...rest] = content.stats;
  const partnerLogos = PARTNER_LOGO_NAMES.map((name) => industry.logos.find((l) => l.name === name)).filter(
    (l): l is IntroIndustryContent["logos"][number] => !!l
  );

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-6 py-16 sm:px-10">
      <BrandBackdrop tone="sunrise" />

      <DotGrid className="left-6 top-8 h-24 w-24 text-slate-400 opacity-[0.3]" />
      <DotGrid className="right-8 bottom-16 h-20 w-20 text-slate-400 opacity-[0.22]" />
      <FlowLines className="-bottom-6 -right-6 opacity-[0.5] sm:bottom-0 sm:right-0" />

      {TRIANGLES.map((t, i) =>
        t.kind === "outline" ? (
          <OutlineTriangle key={i} className={cn(t.pos, t.color, `opacity-[${t.opacity}]`)} size={t.size} rotate={t.rotate} />
        ) : (
          <FilledTriangle key={i} className={cn(t.pos, t.color, `opacity-[${t.opacity}]`)} size={t.size} rotate={t.rotate} />
        )
      )}

      {/* Soft glow seating the figure into the composition rather than leaving her floating on bare background */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 hidden h-[32rem] w-[32rem] -translate-x-1/4 translate-y-1/4 rounded-full opacity-40 blur-3xl lg:block"
        style={{ background: "radial-gradient(circle, var(--brand-purple) 0%, var(--brand-teal) 55%, transparent 75%)" }}
      />
      <StudentPhoto
        students={students}
        id="stats-1"
        className="pointer-events-none absolute bottom-0 left-0 z-0 hidden h-[52%] w-auto object-contain object-bottom drop-shadow-[0_20px_40px_rgba(15,23,42,0.15)] lg:block"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl font-extrabold text-slate-900 sm:text-5xl"
        >
          <HighlightEcom text={content.headline} />
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          whileInView={{ opacity: 1, scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
          className="h-[3px] w-24 rounded-full bg-gradient-to-l from-[var(--brand-purple)] via-[var(--brand-teal)] to-[var(--brand-green)]"
        />

        <div className="flex w-full flex-col gap-5">
          {hero && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.94 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative flex flex-col items-center gap-2 overflow-hidden rounded-[2rem] border border-slate-200 bg-white px-6 py-10 shadow-[0_30px_70px_-30px_rgba(140,82,255,0.35)] sm:py-12"
            >
              <span className="absolute inset-x-0 top-0 h-2 bg-gradient-to-l from-[var(--brand-purple)] via-[var(--brand-teal)] to-[var(--brand-green)]" />
              <AnimatedCounter
                value={hero.value}
                decimals={hero.decimals}
                suffix={hero.suffix}
                delayMs={0}
                className="bg-gradient-to-l from-[var(--brand-purple)] to-[var(--brand-teal)] bg-clip-text text-7xl font-black leading-none text-transparent sm:text-8xl"
              />
              <span className="text-lg font-bold text-slate-700 sm:text-xl">{hero.label}</span>
            </motion.div>
          )}

          <div className="grid w-full grid-cols-3 gap-4">
            {rest.map((stat, i) => {
              const isRating = stat.suffix === "/5";
              const isGoogleReviews = stat.label === "ביקורות Google";
              const isCompanies = stat.label === "חברות ועסקים בקשרי השמה";
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                  className="relative flex flex-col items-center gap-1.5 overflow-hidden rounded-2xl border border-slate-200 bg-white px-3 py-6 shadow-sm"
                >
                  <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-l ${CARD_ACCENTS[i % CARD_ACCENTS.length]}`} />
                  {isGoogleReviews && <GoogleLogo className="size-5" />}
                  <AnimatedCounter
                    value={stat.value}
                    decimals={stat.decimals}
                    suffix={stat.suffix}
                    delayMs={400 + i * 350}
                    className="bg-gradient-to-l from-[var(--brand-purple)] to-[var(--brand-teal)] bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl"
                  />
                  {isRating && <StarRow rating={stat.value} />}
                  <span className="text-xs font-semibold text-slate-600 sm:text-sm">{stat.label}</span>
                  {isCompanies && partnerLogos.length > 0 && (
                    <div className="mt-1 flex items-center justify-center gap-2.5">
                      {partnerLogos.map((logo) => (
                        <div key={logo.name} className="relative h-5 w-11">
                          <Image src={logo.src} alt={logo.name} fill sizes="36px" className="object-contain" />
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        <SectionNav onPrev={onPrev} onNext={onNext} />
      </div>
    </div>
  );
}
