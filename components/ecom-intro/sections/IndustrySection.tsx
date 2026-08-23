"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { IntroIndustryContent } from "@/lib/content/schemas";
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

/** Fixed constellation slots for the desktop logo cloud - index-based (not
 * name-based) so the layout stays content-driven and just cycles if the
 * logo list ever grows past 13. */
const POSITIONS = [
  { pos: "left-[6%] top-[6%]", w: "w-32 sm:w-36" },
  { pos: "left-[33%] top-[2%]", w: "w-28 sm:w-32" },
  { pos: "left-[62%] top-[5%]", w: "w-32 sm:w-40" },
  { pos: "left-[17%] top-[30%]", w: "w-28 sm:w-32" },
  { pos: "left-[46%] top-[26%]", w: "w-28 sm:w-32" },
  { pos: "left-[90%] top-[10%]", w: "w-20 sm:w-24" },
  { pos: "left-[3%] top-[52%]", w: "w-32 sm:w-36" },
  { pos: "left-[38%] top-[54%]", w: "w-40 sm:w-56" },
  { pos: "left-[75%] top-[46%]", w: "w-24 sm:w-28" },
  { pos: "left-[93%] top-[62%]", w: "w-20 sm:w-24" },
  { pos: "left-[16%] top-[80%]", w: "w-28 sm:w-32" },
  { pos: "left-[46%] top-[84%]", w: "w-28 sm:w-32" },
  { pos: "left-[70%] top-[78%]", w: "w-24 sm:w-28" },
] as const;

/** Faint dashed connectors suggesting a network - purely decorative, not tied to exact logo centers. */
function ConnectorLines() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1000 400"
      preserveAspectRatio="none"
    >
      <path d="M60 40 C 220 120, 320 160, 460 220" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 6" fill="none" opacity="0.5" />
      <path d="M460 220 C 560 260, 680 200, 800 90" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 6" fill="none" opacity="0.5" />
      <path d="M180 300 C 320 340, 420 300, 540 340" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 6" fill="none" opacity="0.5" />
      <path d="M540 340 C 680 380, 780 320, 900 260" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 6" fill="none" opacity="0.4" />
    </svg>
  );
}

export function IndustrySection({
  content,
  onNext,
  onPrev,
}: {
  content: IntroIndustryContent;
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

      <div className="relative z-10 mx-auto flex w-full max-w-[90rem] flex-1 flex-col items-center justify-center gap-10">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
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

        {/* Desktop: fixed constellation with faint connector lines, matching the approved reference */}
        <div className="relative mx-auto hidden h-[28rem] w-full max-w-6xl lg:block">
          <ConnectorLines />
          {content.logos.map((logo, i) => {
            const p = POSITIONS[i % POSITIONS.length];
            return (
              <motion.div
                key={logo.name}
                initial={{ opacity: 0, y: 16, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.05 }}
                whileHover={{ scale: 1.08 }}
                className={cn("absolute -translate-x-1/2 -translate-y-1/2", p.pos, p.w)}
              >
                <div className="relative aspect-[3/2] w-full">
                  <Image
                    src={logo.src}
                    alt={logo.name}
                    fill
                    sizes="220px"
                    className="object-contain drop-shadow-[0_4px_10px_rgba(15,23,42,0.08)]"
                  />
                </div>
              </motion.div>
            );
          })}
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
