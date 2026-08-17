"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import type { IntroBrandContent, IntroClosingContent } from "@/lib/content/schemas";
import { Button } from "@/components/ui/button";
import { SectionShell } from "@/components/ecom-intro/SectionShell";

export function ClosingSection({
  content,
  brand,
  onPrev,
  onFinish,
}: {
  content: IntroClosingContent;
  brand: IntroBrandContent;
  onPrev: () => void;
  onFinish: () => void;
}) {
  return (
    <SectionShell maxWidthClassName="max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <Image src={brand.logoMarkSrc} alt="Ecom" width={56} height={56} className="mx-auto h-12 w-12" />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-3xl font-extrabold text-slate-900 sm:text-4xl"
      >
        {content.headline}
      </motion.h2>

      <div className="flex max-w-xl flex-col gap-3">
        {content.body.map((paragraph, i) => (
          <motion.p
            key={paragraph}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
            className="text-lg leading-relaxed text-slate-600"
          >
            {paragraph}
          </motion.p>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="text-sm font-semibold text-[var(--brand-purple)]"
      >
        {content.supportingLine}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="flex flex-col items-center gap-3"
      >
        <Button type="button" size="lg" onClick={onFinish} className="px-9">
          {content.ctaLabel}
          <ArrowLeft className="size-4" />
        </Button>
        <button type="button" onClick={onPrev} className="text-xs font-medium text-slate-400 hover:text-slate-600">
          חזרה
        </button>
      </motion.div>
    </SectionShell>
  );
}
