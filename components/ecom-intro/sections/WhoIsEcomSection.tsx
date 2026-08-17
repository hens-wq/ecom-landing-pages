"use client";

import { motion } from "framer-motion";
import type { IntroWhoIsEcomContent } from "@/lib/content/schemas";
import { ICON_MAP, DEFAULT_ICON } from "@/lib/icon-map";
import { SectionNav } from "@/components/ecom-intro/SectionNav";
import { BrandBackdrop } from "@/components/ecom-intro/BrandBackdrop";

const TILE_ACCENTS = [
  "from-[var(--brand-purple)]/15 to-[var(--brand-purple)]/0 text-[var(--brand-purple)]",
  "from-[var(--brand-teal)]/18 to-[var(--brand-teal)]/0 text-[var(--brand-teal)]",
  "from-[var(--brand-green)]/18 to-[var(--brand-green)]/0 text-emerald-600",
];

export function WhoIsEcomSection({
  content,
  onNext,
  onPrev,
}: {
  content: IntroWhoIsEcomContent;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-6 py-20 sm:px-10">
      <BrandBackdrop tone="violet" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-10 text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--brand-purple)]"
        >
          מכללה ללימודי הייטק ודיגיטל
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="max-w-3xl text-4xl font-extrabold text-slate-900 sm:text-5xl"
        >
          {content.headline}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl"
        >
          {content.statement}
        </motion.p>

        <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {content.courseAreas.map((area, i) => {
            const Icon = ICON_MAP[area.icon] ?? DEFAULT_ICON;
            const accent = TILE_ACCENTS[i % TILE_ACCENTS.length];
            return (
              <motion.div
                key={area.label}
                initial={{ opacity: 0, y: 24, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: 0.2 + i * 0.06 }}
                whileHover={{ y: -4 }}
                className="group flex flex-col items-center gap-3 rounded-3xl border border-slate-200 bg-white/80 px-3 py-6 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-lg"
              >
                <span
                  className={`flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} shadow-inner`}
                >
                  <Icon className="size-6" />
                </span>
                <span className="text-sm font-bold text-slate-800">{area.label}</span>
              </motion.div>
            );
          })}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.75 }}
          className="text-sm font-semibold tracking-wide text-slate-400"
        >
          {content.supportingStatement}
        </motion.p>

        <SectionNav onPrev={onPrev} onNext={onNext} />
      </div>
    </div>
  );
}
