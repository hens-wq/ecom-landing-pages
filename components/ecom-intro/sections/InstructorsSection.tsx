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

        <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
          {content.instructors.map((instructor, i) => (
            <motion.div
              key={instructor.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -6 }}
              className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-xl"
            >
              <div className="relative aspect-[4/5] w-full">
                <Image
                  src={instructor.photoSrc}
                  alt={instructor.name}
                  fill
                  sizes="(min-width: 640px) 25vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  style={{ objectPosition: "50% 15%" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-1 p-4 text-right">
                  <span className="text-base font-extrabold text-white drop-shadow">{instructor.name}</span>
                  <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-bold text-[var(--brand-purple)]">
                    {instructor.course ?? "מרצה/ת ב-Ecom"}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <SectionNav onPrev={onPrev} onNext={onNext} />
      </div>
    </div>
  );
}
