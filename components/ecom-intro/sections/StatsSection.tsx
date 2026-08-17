"use client";

import { motion } from "framer-motion";
import type { IntroStatsContent } from "@/lib/content/schemas";
import { SectionShell } from "@/components/ecom-intro/SectionShell";
import { SectionNav } from "@/components/ecom-intro/SectionNav";
import { AnimatedCounter } from "@/components/ecom-intro/AnimatedCounter";

export function StatsSection({
  content,
  onNext,
  onPrev,
}: {
  content: IntroStatsContent;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <SectionShell maxWidthClassName="max-w-3xl">
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-3xl font-extrabold text-slate-900 sm:text-4xl"
      >
        {content.headline}
      </motion.h2>

      <div className="grid w-full grid-cols-2 gap-4 sm:gap-6">
        {content.stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="flex flex-col items-center gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-8 shadow-sm sm:py-10"
          >
            <AnimatedCounter
              value={stat.value}
              decimals={stat.decimals}
              suffix={stat.suffix}
              className="bg-gradient-to-l from-[var(--brand-purple)] to-[var(--brand-teal)] bg-clip-text text-4xl font-extrabold text-transparent sm:text-5xl"
            />
            <span className="text-sm font-medium text-slate-500 sm:text-base">{stat.label}</span>
          </motion.div>
        ))}
      </div>

      <SectionNav onPrev={onPrev} onNext={onNext} />
    </SectionShell>
  );
}
