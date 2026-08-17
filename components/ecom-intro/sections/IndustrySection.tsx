"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { IntroIndustryContent } from "@/lib/content/schemas";
import { SectionNav } from "@/components/ecom-intro/SectionNav";
import { BrandBackdrop } from "@/components/ecom-intro/BrandBackdrop";

export function IndustrySection({
  content,
  onNext,
  onPrev,
}: {
  content: IntroIndustryContent;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-6 py-20 sm:px-10">
      <BrandBackdrop tone="violet" />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center gap-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--brand-purple)]"
          >
            {content.alternativeHeadline}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.05 }}
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

        {/* Full-width wall - every logo visible at once, generously sized */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full rounded-[2.5rem] border border-slate-200 bg-white/70 p-6 shadow-[0_30px_80px_-40px_rgba(140,82,255,0.3)] backdrop-blur-sm sm:p-10"
        >
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 sm:gap-5 lg:grid-cols-7">
            {content.logos.map((logo, i) => (
              <motion.div
                key={logo.name}
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.25 + i * 0.03 }}
                whileHover={{ y: -3, scale: 1.03 }}
                className="flex h-20 items-center justify-center rounded-2xl border border-slate-100 bg-white px-4 shadow-sm transition-shadow hover:shadow-md sm:h-24"
              >
                <div className="relative h-9 w-full sm:h-11">
                  <Image src={logo.src} alt={logo.name} fill sizes="140px" className="object-contain" />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <SectionNav onPrev={onPrev} onNext={onNext} />
      </div>
    </div>
  );
}
