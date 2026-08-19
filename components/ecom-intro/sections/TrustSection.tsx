"use client";

import { motion } from "framer-motion";
import { Award, FileCheck2, GraduationCap, ShieldCheck, type LucideIcon } from "lucide-react";
import type { IntroStudentsContent, IntroTrustContent } from "@/lib/content/schemas";
import { SectionNav } from "@/components/ecom-intro/SectionNav";
import { BrandBackdrop } from "@/components/ecom-intro/BrandBackdrop";
import { StudentPhoto } from "@/components/ecom-intro/StudentPhoto";

/** Purely decorative, matched by keyword against our own fixed trust copy - not content-driven. */
function iconFor(headline: string): LucideIcon {
  if (headline.includes("ISO")) return Award;
  if (headline.includes("משרד העבודה")) return FileCheck2;
  if (headline.includes("משרד הביטחון")) return ShieldCheck;
  if (headline.includes("פדגוגי")) return GraduationCap;
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

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-10 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl font-extrabold text-slate-900 sm:text-5xl"
        >
          {content.headline}
        </motion.h2>

        <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
          {content.items.map((item, i) => {
            const Icon = iconFor(item.headline);
            return (
              <motion.div
                key={item.headline}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="flex flex-col items-center gap-3 rounded-3xl border border-slate-200 bg-white px-6 py-8 text-center shadow-[0_20px_50px_-30px_rgba(15,23,42,0.35)]"
              >
                <span className="flex size-16 items-center justify-center rounded-full bg-[var(--brand-teal)]/10 text-[var(--brand-teal)]">
                  <Icon className="size-7" />
                </span>
                <span className="text-lg font-extrabold leading-snug text-slate-900">{item.headline}</span>
                <p className="text-sm leading-relaxed text-slate-600">{item.explanation}</p>
              </motion.div>
            );
          })}
        </div>

        <SectionNav onPrev={onPrev} onNext={onNext} />
      </div>
    </div>
  );
}
