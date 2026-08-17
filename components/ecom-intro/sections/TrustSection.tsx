"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import type { IntroTrustContent } from "@/lib/content/schemas";
import { SectionShell } from "@/components/ecom-intro/SectionShell";
import { SectionNav } from "@/components/ecom-intro/SectionNav";

export function TrustSection({
  content,
  onNext,
  onPrev,
}: {
  content: IntroTrustContent;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <SectionShell maxWidthClassName="max-w-2xl">
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-3xl font-extrabold text-slate-900 sm:text-4xl"
      >
        {content.headline}
      </motion.h2>

      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {content.items.map((item, i) => (
          <motion.div
            key={item}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-right shadow-sm"
          >
            <CheckCircle2 className="size-5 shrink-0 text-[var(--brand-teal)]" />
            <span className="text-sm font-semibold text-slate-800">{item}</span>
          </motion.div>
        ))}
      </div>

      <SectionNav onPrev={onPrev} onNext={onNext} />
    </SectionShell>
  );
}
