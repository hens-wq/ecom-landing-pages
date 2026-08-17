"use client";

import { motion } from "framer-motion";
import type { IntroWhoIsEcomContent } from "@/lib/content/schemas";
import { ICON_MAP, DEFAULT_ICON } from "@/lib/icon-map";
import { SectionShell } from "@/components/ecom-intro/SectionShell";
import { SectionNav } from "@/components/ecom-intro/SectionNav";

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
    <SectionShell>
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
        className="max-w-2xl text-lg leading-relaxed text-slate-600"
      >
        {content.statement}
      </motion.p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {content.courseAreas.map((area, i) => {
          const Icon = ICON_MAP[area.icon] ?? DEFAULT_ICON;
          return (
            <motion.div
              key={area.label}
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.06 }}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm"
            >
              <Icon className="size-4 text-[var(--brand-purple)]" />
              {area.label}
            </motion.div>
          );
        })}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="text-sm font-medium text-slate-400"
      >
        {content.supportingStatement}
      </motion.p>

      <SectionNav onPrev={onPrev} onNext={onNext} />
    </SectionShell>
  );
}
