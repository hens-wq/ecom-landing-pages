"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { IntroBrandContent, IntroIndustryContent } from "@/lib/content/schemas";
import { SectionNav } from "@/components/ecom-intro/SectionNav";
import { BrandBackdrop } from "@/components/ecom-intro/BrandBackdrop";
import { HighlightEcom } from "@/components/ecom-intro/HighlightEcom";
import { DotGrid, FilledTriangle, FlowLines, OutlineTriangle } from "@/components/shared/GeometricDecor";
import { cn } from "@/lib/utils";

/** Corner/edge accents mirroring the Welcome screen's decorative language. */
const TRIANGLES = [
  { kind: "outline", size: 200, pos: "-right-16 -top-14", opacity: 0.45, rotate: 10, color: "text-[var(--brand-purple)]" },
  { kind: "outline", size: 160, pos: "-left-14 -bottom-16", opacity: 0.3, rotate: -12, color: "text-[var(--brand-teal)]" },
  { kind: "outline", size: 34, pos: "left-[9%] top-[9%]", opacity: 0.3, rotate: -20, color: "text-slate-400" },
  { kind: "filled", size: 16, pos: "left-[13%] top-[21%]", opacity: 0.75, rotate: 90, color: "text-[var(--brand-green)]" },
  { kind: "outline", size: 22, pos: "right-[3%] top-[9%]", opacity: 0.4, rotate: -10, color: "text-[var(--brand-teal)]" },
  { kind: "filled", size: 18, pos: "right-[3%] top-[42%]", opacity: 0.55, rotate: 90, color: "text-[var(--brand-purple)]" },
  { kind: "filled", size: 20, pos: "right-[7%] bottom-[10%]", opacity: 0.5, rotate: 90, color: "text-[var(--brand-purple)]" },
] as const;

/**
 * Ring of logos orbiting the Ecom mark - positions are computed from the
 * logo count (not hardcoded per-name slots), so this keeps working if
 * content/site/ecom-intro/industry.json ever adds or removes a company.
 */
function OrbitLogos({ logos, markSrc }: { logos: IntroIndustryContent["logos"]; markSrc: string }) {
  const rx = 46;
  const ry = 40;
  const dotCount = logos.length;

  return (
    <div className="relative mx-auto aspect-[16/9] w-full max-w-5xl">
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <ellipse
          cx="50"
          cy="50"
          rx={rx}
          ry={ry}
          fill="none"
          stroke="var(--brand-purple)"
          strokeWidth="0.25"
          strokeDasharray="1.4 2.6"
          opacity="0.35"
        />
        {Array.from({ length: dotCount }).map((_, i) => {
          const angle = ((i + 0.5) / dotCount) * 2 * Math.PI - Math.PI / 2;
          const cx = 50 + rx * Math.cos(angle);
          const cy = 50 + ry * Math.sin(angle);
          return <circle key={i} cx={cx} cy={cy} r="0.5" fill="var(--brand-purple)" opacity="0.4" />;
        })}
      </svg>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
      >
        <div className="flex size-20 items-center justify-center rounded-full bg-white shadow-[0_20px_50px_-15px_rgba(140,82,255,0.45)] sm:size-28">
          <Image src={markSrc} alt="Ecom" width={100} height={100} className="h-12 w-12 object-contain sm:h-16 sm:w-16" />
        </div>
      </motion.div>

      {logos.map((logo, i) => {
        const angle = (i / logos.length) * 2 * Math.PI - Math.PI / 2;
        const left = 50 + rx * Math.cos(angle);
        const top = 50 + ry * Math.sin(angle);
        return (
          <motion.div
            key={logo.name}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.04 }}
            whileHover={{ scale: 1.08 }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <div className="flex h-14 w-24 items-center justify-center rounded-2xl border border-slate-100 bg-white px-3 py-2 shadow-[0_10px_25px_-10px_rgba(15,23,42,0.25)] sm:h-16 sm:w-28">
              <div className="relative h-full w-full">
                <Image src={logo.src} alt={logo.name} fill sizes="140px" className="object-contain" />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export function IndustrySection({
  content,
  brand,
  onNext,
  onPrev,
}: {
  content: IntroIndustryContent;
  brand: IntroBrandContent;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-6 py-16 sm:px-10">
      <BrandBackdrop tone="violet" />

      <DotGrid className="left-6 top-8 h-24 w-24 text-slate-400 opacity-[0.32]" />
      <DotGrid className="right-8 bottom-16 h-20 w-20 text-slate-400 opacity-[0.22]" />
      <FlowLines className="-bottom-6 -left-6 -scale-x-100 opacity-[0.5] sm:bottom-0 sm:left-0" />

      {TRIANGLES.map((t, i) =>
        t.kind === "outline" ? (
          <OutlineTriangle key={i} className={cn(t.pos, t.color, `opacity-[${t.opacity}]`)} size={t.size} rotate={t.rotate} />
        ) : (
          <FilledTriangle key={i} className={cn(t.pos, t.color, `opacity-[${t.opacity}]`)} size={t.size} rotate={t.rotate} />
        )
      )}

      <div className="relative z-10 mx-auto flex w-full max-w-[90rem] flex-1 flex-col items-center justify-center gap-8">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3 text-[11px] font-bold tracking-[0.3em] text-[var(--brand-purple)]"
          >
            <span className="h-px w-10 bg-[var(--brand-purple)]/30" />
            STRONGER TOGETHER
            <span className="h-px w-10 bg-[var(--brand-purple)]/30" />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-5xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl"
          >
            <HighlightEcom text={content.headline} />
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="max-w-xl text-lg leading-relaxed text-slate-700"
          >
            {content.body}
          </motion.p>
        </div>

        {/* Desktop: logos orbiting the Ecom mark, matching the approved reference */}
        <div className="hidden w-full lg:block">
          <OrbitLogos logos={content.logos} markSrc={brand.logoMarkSrc} />
        </div>

        {/* Mobile/tablet: simple organic wrap so nothing overlaps at narrow widths */}
        <div className="flex w-full flex-wrap items-center justify-center gap-x-10 gap-y-8 px-4 lg:hidden">
          {content.logos.map((logo, i) => (
            <motion.div
              key={logo.name}
              initial={{ opacity: 0, y: 16, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.05 }}
              className="relative h-12 w-32 shrink-0 sm:h-14 sm:w-36"
            >
              <Image
                src={logo.src}
                alt={logo.name}
                fill
                sizes="180px"
                className="object-contain drop-shadow-[0_4px_10px_rgba(15,23,42,0.08)]"
              />
            </motion.div>
          ))}
        </div>

        {content.logosCaption && (
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-sm font-semibold text-slate-500"
          >
            {content.logosCaption}
          </motion.p>
        )}

        <SectionNav onPrev={onPrev} onNext={onNext} />
      </div>
    </div>
  );
}
