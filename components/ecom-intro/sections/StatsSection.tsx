"use client";

import { motion } from "framer-motion";
import type { IntroStatsContent } from "@/lib/content/schemas";
import { SectionNav } from "@/components/ecom-intro/SectionNav";
import { BrandBackdrop } from "@/components/ecom-intro/BrandBackdrop";
import { AnimatedCounter } from "@/components/ecom-intro/AnimatedCounter";

const CARD_ACCENTS = [
  "from-[var(--brand-purple)] to-[var(--brand-teal)]",
  "from-[var(--brand-teal)] to-[var(--brand-green)]",
  "from-[var(--brand-green)] to-[var(--brand-purple)]",
  "from-[var(--brand-purple)] to-[var(--brand-green)]",
];

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
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-6 py-20 sm:px-10">
      <BrandBackdrop tone="sunrise" strong />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-12 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl font-extrabold text-slate-900 sm:text-5xl"
        >
          {content.headline}
        </motion.h2>

        <div className="grid w-full grid-cols-2 gap-5 sm:gap-8">
          {content.stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30, scale: 0.92 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.12 }}
              className="relative flex flex-col items-center gap-3 overflow-hidden rounded-[2rem] border border-slate-200 bg-white px-6 py-10 shadow-[0_25px_60px_-30px_rgba(15,23,42,0.25)] sm:py-14"
            >
              <span className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-l ${CARD_ACCENTS[i % CARD_ACCENTS.length]}`} />
              <AnimatedCounter
                value={stat.value}
                decimals={stat.decimals}
                suffix={stat.suffix}
                className="bg-gradient-to-l from-[var(--brand-purple)] to-[var(--brand-teal)] bg-clip-text text-6xl font-black leading-none text-transparent sm:text-7xl"
              />
              <span className="text-base font-semibold text-slate-600 sm:text-lg">{stat.label}</span>
            </motion.div>
          ))}
        </div>

        <SectionNav onPrev={onPrev} onNext={onNext} />
      </div>
    </div>
  );
}
