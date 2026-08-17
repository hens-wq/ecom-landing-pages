"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import type { IntroArielContent, IntroBrandContent } from "@/lib/content/schemas";
import { SectionShell } from "@/components/ecom-intro/SectionShell";
import { SectionNav } from "@/components/ecom-intro/SectionNav";

export function ArielSection({
  content,
  brand,
  onNext,
  onPrev,
}: {
  content: IntroArielContent;
  brand: IntroBrandContent;
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

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="flex items-center justify-center gap-6 rounded-3xl border border-slate-200 bg-white px-8 py-8 shadow-sm sm:gap-10 sm:px-12"
      >
        <Image src={brand.logoMarkSrc} alt="Ecom" width={64} height={64} className="h-14 w-14 sm:h-16 sm:w-16" />
        <Plus className="size-5 text-slate-300" />
        <Image
          src={content.logoSrc}
          alt="אוניברסיטת אריאל בשומרון"
          width={200}
          height={200}
          className="h-20 w-auto sm:h-24"
        />
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="max-w-xl text-lg leading-relaxed text-slate-600"
      >
        {content.body}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="flex flex-wrap items-center justify-center gap-2"
      >
        {content.applicablePrograms.map((program) => (
          <span
            key={program}
            className="rounded-full bg-[var(--brand-purple)]/8 px-4 py-2 text-sm font-semibold text-[var(--brand-purple)]"
          >
            {program}
          </span>
        ))}
      </motion.div>

      {content.clarification && (
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-xs text-slate-400"
        >
          {content.clarification}
        </motion.p>
      )}

      <SectionNav onPrev={onPrev} onNext={onNext} />
    </SectionShell>
  );
}
