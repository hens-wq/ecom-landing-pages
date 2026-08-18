"use client";

import { motion } from "framer-motion";
import { Award, FileCheck2, GraduationCap, ShieldCheck, type LucideIcon } from "lucide-react";
import type { IntroStudentsContent, IntroTrustContent } from "@/lib/content/schemas";
import { SectionNav } from "@/components/ecom-intro/SectionNav";
import { BrandBackdrop } from "@/components/ecom-intro/BrandBackdrop";
import { StudentPhoto } from "@/components/ecom-intro/StudentPhoto";

/** Purely decorative, matched by keyword against our own fixed trust copy - not content-driven. */
function iconFor(item: string): LucideIcon {
  if (item.includes("ISO")) return Award;
  if (item.includes("משרד העבודה")) return FileCheck2;
  if (item.includes("משרד הביטחון")) return ShieldCheck;
  if (item.includes("פדגוגי")) return GraduationCap;
  return Award;
}

export function TrustSection({
  content,
  students,
  onNext,
  onPrev,
}: {
  content: IntroTrustContent;
  students: IntroStudentsContent;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-6 py-16 sm:px-10">
      <BrandBackdrop tone="teal" strong />
      <StudentPhoto
        students={students}
        id="trust-1"
        className="pointer-events-none absolute bottom-0 right-0 z-0 hidden h-[55%] w-auto object-contain object-bottom opacity-35 lg:block"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-14 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl font-extrabold text-slate-900 sm:text-5xl"
        >
          {content.headline}
        </motion.h2>

        <div className="grid w-full grid-cols-2 gap-6 sm:grid-cols-4">
          {content.items.map((item, i) => {
            const Icon = iconFor(item);
            return (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 30, scale: 0.85 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.18 }}
                className="flex flex-col items-center gap-4"
              >
                <span className="flex size-20 items-center justify-center rounded-full bg-white text-[var(--brand-teal)] shadow-[0_20px_45px_-20px_rgba(52,209,195,0.5)] ring-1 ring-slate-100 sm:size-24">
                  <Icon className="size-9 sm:size-10" />
                </span>
                <span className="text-sm font-bold leading-snug text-slate-800 sm:text-base">{item}</span>
              </motion.div>
            );
          })}
        </div>

        <SectionNav onPrev={onPrev} onNext={onNext} />
      </div>
    </div>
  );
}
