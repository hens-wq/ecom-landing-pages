"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { BadgeCheck, ClipboardCheck, ShieldCheck, UserCheck } from "lucide-react";
import type { IntroArielContent, IntroBrandContent, IntroStudentsContent } from "@/lib/content/schemas";
import { SectionNav } from "@/components/ecom-intro/SectionNav";
import { BrandBackdrop } from "@/components/ecom-intro/BrandBackdrop";
import { StudentPhoto } from "@/components/ecom-intro/StudentPhoto";
import { DotGrid } from "@/components/shared/GeometricDecor";

const BENEFIT_ICONS = [ShieldCheck, ClipboardCheck, UserCheck, BadgeCheck];

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
      <StudentPhoto
        students={students}
        id="ariel-1"
        className="pointer-events-none absolute bottom-0 left-0 z-0 hidden h-[70%] w-auto object-contain object-bottom opacity-80 lg:block"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-8 text-center">
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
          <DotGrid className="left-6 top-6 h-14 w-14 text-[var(--brand-teal)] opacity-20" />
          <div className="flex items-center justify-center border-e border-slate-100 px-6 py-10 sm:py-14">
            <Image
              src={brand.logoStackedSrc}
              alt="Ecom School"
              width={220}
              height={121}
              className="relative h-auto w-32 sm:w-40"
            />
          </div>
          <div className="flex items-center justify-center px-6 py-10 sm:py-14">
            <Image
              src={content.logoSrc}
              alt="אוניברסיטת אריאל בשומרון"
              width={280}
              height={280}
              className="relative h-20 w-auto sm:h-28"
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
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3.5 text-right shadow-sm backdrop-blur-sm"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-teal)]/12 text-[var(--brand-teal)]">
                  <Icon className="size-4.5" />
                </span>
                <span className="text-sm font-bold text-slate-800">{benefit}</span>
              </motion.div>
            );
          })}
        </div>

        <SectionNav onPrev={onPrev} onNext={onNext} />
      </div>
    </div>
  );
}
