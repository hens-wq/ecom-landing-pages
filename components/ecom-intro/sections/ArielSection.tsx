"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Award, ClipboardCheck, ShieldCheck, UserCheck } from "lucide-react";
import type { IntroArielContent, IntroBrandContent, IntroStudentsContent } from "@/lib/content/schemas";
import { SectionNav } from "@/components/ecom-intro/SectionNav";
import { BrandBackdrop } from "@/components/ecom-intro/BrandBackdrop";
import { StudentPhoto } from "@/components/ecom-intro/StudentPhoto";
import { DotGrid, FilledTriangle, FlowLines, OutlineTriangle } from "@/components/shared/GeometricDecor";
import { cn } from "@/lib/utils";

const BENEFIT_ICONS = [ShieldCheck, ClipboardCheck, UserCheck, Award];
const BENEFIT_ICON_STYLES = [
  "bg-[var(--brand-teal)]/12 text-[var(--brand-teal)]",
  "bg-[var(--brand-purple)]/12 text-[var(--brand-purple)]",
  "bg-[var(--brand-purple)]/12 text-[var(--brand-purple)]",
  "bg-[var(--brand-green)]/12 text-[var(--brand-green)]",
];

/** Own scatter for this screen - same decorative vocabulary as Welcome/Industry, different composition. */
const TRIANGLES = [
  { kind: "outline", size: 190, pos: "-right-16 -top-14", opacity: 0.42, rotate: -8, color: "text-[var(--brand-purple)]" },
  { kind: "filled", size: 50, pos: "right-[6%] top-[4%]", opacity: 0.22, rotate: 15, color: "text-[var(--brand-teal)]" },
  { kind: "outline", size: 30, pos: "left-[9%] top-[8%]", opacity: 0.3, rotate: -15, color: "text-slate-400" },
  { kind: "filled", size: 18, pos: "left-[16%] top-[46%]", opacity: 0.5, rotate: 100, color: "text-[var(--brand-green)]" },
  { kind: "filled", size: 20, pos: "left-[6%] bottom-[16%]", opacity: 0.55, rotate: -20, color: "text-[var(--brand-teal)]" },
  { kind: "outline", size: 26, pos: "right-[4%] top-[42%]", opacity: 0.35, rotate: 10, color: "text-[var(--brand-purple)]" },
  { kind: "filled", size: 18, pos: "right-[8%] bottom-[8%]", opacity: 0.5, rotate: 90, color: "text-[var(--brand-purple)]" },
] as const;

export function ArielSection({
  content,
  brand,
  students,
  onNext,
  onPrev,
}: {
  content: IntroArielContent;
  brand: IntroBrandContent;
  students: IntroStudentsContent;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-6 py-16 sm:px-10">
      <BrandBackdrop tone="teal" />

      <DotGrid className="left-6 top-8 h-24 w-24 text-slate-400 opacity-[0.32]" />
      <DotGrid className="right-10 bottom-16 h-20 w-20 text-slate-400 opacity-[0.22]" />
      <FlowLines className="-bottom-6 -right-6 opacity-[0.5] sm:bottom-0 sm:right-0" />

      {TRIANGLES.map((t, i) =>
        t.kind === "outline" ? (
          <OutlineTriangle key={i} className={cn(t.pos, t.color, `opacity-[${t.opacity}]`)} size={t.size} rotate={t.rotate} />
        ) : (
          <FilledTriangle key={i} className={cn(t.pos, t.color, `opacity-[${t.opacity}]`)} size={t.size} rotate={t.rotate} />
        )
      )}

      <StudentPhoto
        students={students}
        id="ariel-1"
        className="pointer-events-none absolute bottom-0 left-[2%] z-[1] hidden h-[85%] w-auto object-contain object-bottom drop-shadow-[0_20px_40px_rgba(15,23,42,0.15)] lg:block"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center justify-center gap-6">
        <div className="flex w-full max-w-4xl flex-col items-center gap-8 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl"
          >
            {content.headline}
          </motion.h2>

          {/* Big unified lockup: two substantial brands, each centered in its own half */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="relative grid w-full grid-cols-2 overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-[0_30px_80px_-30px_rgba(52,209,195,0.35)]"
          >
            <div className="flex items-center justify-center border-e border-slate-100 px-6 py-10 sm:py-14">
              <Image
                src={brand.logoStackedSrc}
                alt="Ecom School"
                width={220}
                height={121}
                className="relative h-auto w-36 sm:w-44"
              />
            </div>
            <div className="flex items-center justify-center px-6 py-10 sm:py-14">
              <Image
                src={content.logoSrc}
                alt="אוניברסיטת אריאל בשומרון"
                width={280}
                height={280}
                className="relative h-24 w-auto sm:h-32"
              />
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="max-w-2xl text-lg leading-relaxed text-slate-700"
          >
            {content.body}
          </motion.p>

          {/* Benefits - the point of this screen */}
          <div className="grid w-full grid-cols-2 gap-3 sm:gap-4">
            {content.benefits.map((benefit, i) => {
              const Icon = BENEFIT_ICONS[i % BENEFIT_ICONS.length];
              return (
                <motion.div
                  key={benefit}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: 0.25 + i * 0.1 }}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-right shadow-sm"
                >
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-full",
                      BENEFIT_ICON_STYLES[i % BENEFIT_ICON_STYLES.length]
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="text-sm font-bold text-slate-800 sm:text-base">{benefit}</span>
                </motion.div>
              );
            })}
          </div>

          <SectionNav onPrev={onPrev} onNext={onNext} />
        </div>

        <div aria-hidden className="hidden shrink-0 lg:block lg:w-48 xl:w-60" />
      </div>
    </div>
  );
}
