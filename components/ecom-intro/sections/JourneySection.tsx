"use client";

import { motion } from "framer-motion";
import type { IntroJourneyContent } from "@/lib/content/schemas";
import { SectionNav } from "@/components/ecom-intro/SectionNav";
import { BrandBackdrop } from "@/components/ecom-intro/BrandBackdrop";

export function JourneySection({
  content,
  onNext,
  onPrev,
}: {
  content: IntroJourneyContent;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-6 py-20 sm:px-10">
      <BrandBackdrop tone="green" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-12 text-center">
        <div className="flex flex-col items-center gap-4">
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
            className="max-w-xl text-lg leading-relaxed text-slate-600"
          >
            {content.body}
          </motion.p>
        </div>

        {/* Wide horizontal stepper with a connecting line, alternating card offset */}
        <div className="relative w-full">
          <div className="absolute inset-x-0 top-1/2 hidden h-[2px] -translate-y-1/2 bg-gradient-to-l from-[var(--brand-purple)]/40 via-[var(--brand-teal)]/40 to-[var(--brand-green)]/40 lg:block" />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {content.steps.map((step, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className={`relative flex flex-col items-center gap-3 ${i % 2 === 1 ? "lg:translate-y-10" : ""}`}
              >
                <span className="flex size-16 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-teal)] text-xl font-extrabold text-white shadow-[0_12px_30px_-8px_rgba(140,82,255,0.5)]">
                  {i + 1}
                </span>
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
                  <span className="font-bold text-slate-800">{step}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <SectionNav onPrev={onPrev} onNext={onNext} />
      </div>
    </div>
  );
}
