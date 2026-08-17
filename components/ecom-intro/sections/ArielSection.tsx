"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";
import type { IntroArielContent, IntroBrandContent } from "@/lib/content/schemas";
import { SectionNav } from "@/components/ecom-intro/SectionNav";
import { BrandBackdrop } from "@/components/ecom-intro/BrandBackdrop";
import { DotGrid, OutlineTriangle } from "@/components/shared/GeometricDecor";

export function ArielSection({
  content,
  brand,
  onNext,
  onPrev,
}: {
  content: IntroArielContent;
  brand: IntroBrandContent;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-6 py-20 sm:px-10">
      <BrandBackdrop tone="teal" />

      <div className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-stretch gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
        {/* Left: oversized lockup panel, filled with a real derived stat instead of empty padding */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative flex flex-col items-center justify-center gap-8 overflow-hidden rounded-[2.5rem] border border-white/60 bg-gradient-to-br from-white to-[var(--brand-teal)]/10 p-10 shadow-[0_30px_80px_-30px_rgba(52,209,195,0.35)] sm:p-14"
        >
          <DotGrid className="left-6 top-6 h-16 w-16 text-[var(--brand-teal)] opacity-20" />
          <OutlineTriangle className="-bottom-6 -right-6 text-[var(--brand-purple)] opacity-[0.12]" size={140} rotate={-10} />

          <div className="relative flex items-center gap-6 sm:gap-8">
            <Image src={brand.logoMarkSrc} alt="Ecom" width={72} height={72} className="h-16 w-16 sm:h-20 sm:w-20" />
            <span className="text-3xl font-light text-slate-300">+</span>
            <Image
              src={content.logoSrc}
              alt="אוניברסיטת אריאל בשומרון"
              width={220}
              height={220}
              className="h-24 w-auto sm:h-28"
            />
          </div>

          <div className="relative flex flex-col items-center gap-1">
            <span className="bg-gradient-to-l from-[var(--brand-teal)] to-[var(--brand-purple)] bg-clip-text text-6xl font-black leading-none text-transparent sm:text-7xl">
              {content.applicablePrograms.length}
            </span>
            <span className="text-sm font-bold text-slate-500">מסלולים בפיקוח ואישור פדגוגי</span>
          </div>

          <span className="relative flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-[var(--brand-teal)] shadow-sm">
            <GraduationCap className="size-4" />
            אוניברסיטת אריאל בשומרון
          </span>
        </motion.div>

        {/* Right: editorial text column */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
          className="flex flex-col items-start justify-center gap-6 text-right"
        >
          <h2 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">{content.headline}</h2>
          <p className="max-w-xl text-lg leading-relaxed text-slate-600">{content.body}</p>

          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">המסלולים המאושרים</p>
            <div className="flex flex-col gap-2">
              {content.applicablePrograms.map((program, i) => (
                <motion.div
                  key={program}
                  initial={{ opacity: 0, x: 12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
                  className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-teal)]/15 text-xs font-bold text-[var(--brand-teal)]">
                    {i + 1}
                  </span>
                  <span className="font-semibold text-slate-800">{program}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {content.clarification && <p className="text-xs text-slate-400">{content.clarification}</p>}
        </motion.div>
      </div>

      <div className="relative z-10 mt-10">
        <SectionNav onPrev={onPrev} onNext={onNext} />
      </div>
    </div>
  );
}
