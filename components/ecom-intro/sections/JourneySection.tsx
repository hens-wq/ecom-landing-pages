"use client";

import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import type { IntroJourneyContent } from "@/lib/content/schemas";
import { SectionShell } from "@/components/ecom-intro/SectionShell";
import { SectionNav } from "@/components/ecom-intro/SectionNav";

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
    <SectionShell maxWidthClassName="max-w-xl">
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-3xl font-extrabold text-slate-900 sm:text-4xl"
      >
        {content.headline}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="max-w-lg text-lg leading-relaxed text-slate-600"
      >
        {content.body}
      </motion.p>

      <div className="flex flex-col items-center gap-1.5">
        {content.steps.map((step, i) => (
          <motion.div key={step} className="flex flex-col items-center gap-1.5">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.2 + i * 0.15 }}
              className="flex min-w-56 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 shadow-sm"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-purple)]/10 text-xs font-bold text-[var(--brand-purple)]">
                {i + 1}
              </span>
              <span className="font-semibold text-slate-800">{step}</span>
            </motion.div>
            {i < content.steps.length - 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.25 + i * 0.15 }}
              >
                <ArrowDown className="size-4 text-slate-300" />
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      <SectionNav onPrev={onPrev} onNext={onNext} />
    </SectionShell>
  );
}
