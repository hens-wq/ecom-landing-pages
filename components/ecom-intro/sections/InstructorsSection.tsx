"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Briefcase } from "lucide-react";
import type { IntroInstructorsContent } from "@/lib/content/schemas";
import { SectionNav } from "@/components/ecom-intro/SectionNav";
import { BrandBackdrop } from "@/components/ecom-intro/BrandBackdrop";

export function InstructorsSection({
  content,
  onNext,
  onPrev,
}: {
  content: IntroInstructorsContent;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-6 py-16 sm:px-10">
      <BrandBackdrop tone="green" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-10 text-center">
        <div className="flex flex-col items-center gap-3">
          <span className="flex items-center gap-2 rounded-full bg-[var(--brand-purple)]/10 px-4 py-1.5 text-xs font-bold text-[var(--brand-purple)]">
            <Briefcase className="size-4" />
            אנשי מקצוע מהתעשייה
          </span>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-4xl font-extrabold text-slate-900 sm:text-5xl"
          >
            {content.headline}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="max-w-2xl text-lg leading-relaxed text-slate-700"
          >
            {content.body}
          </motion.p>
        </div>

        <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
          {content.instructors.map((instructor, i) => (
            <motion.div
              key={instructor.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className="group flex items-center gap-5 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 text-right shadow-sm transition-shadow hover:shadow-xl"
            >
              <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl sm:size-28">
                <Image
                  src={instructor.photoSrc}
                  alt={instructor.name}
                  fill
                  sizes="112px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  style={{ objectPosition: "50% 15%" }}
                />
              </div>
              <div className="flex flex-1 flex-col items-start gap-1.5">
                {instructor.course && (
                  <span className="rounded-full bg-[var(--brand-purple)]/10 px-2.5 py-0.5 text-[11px] font-bold text-[var(--brand-purple)]">
                    {instructor.course}
                  </span>
                )}
                <span className="text-lg font-extrabold text-slate-900">{instructor.name}</span>
                {instructor.role && <span className="text-sm font-bold text-[var(--brand-teal)]">{instructor.role}</span>}
                {instructor.description && (
                  <p className="text-xs leading-relaxed text-slate-600">{instructor.description}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <SectionNav onPrev={onPrev} onNext={onNext} />
      </div>
    </div>
  );
}
