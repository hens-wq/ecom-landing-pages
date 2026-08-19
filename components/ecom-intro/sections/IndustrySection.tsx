"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { IntroIndustryContent } from "@/lib/content/schemas";
import { SectionNav } from "@/components/ecom-intro/SectionNav";
import { BrandBackdrop } from "@/components/ecom-intro/BrandBackdrop";

/** Cycled per logo (not random) so the scatter is organic but stable across renders. */
const SCATTER = [
  { h: "h-9 sm:h-11", shift: "translate-y-0" },
  { h: "h-14 sm:h-16", shift: "translate-y-6" },
  { h: "h-8 sm:h-10", shift: "-translate-y-2" },
  { h: "h-12 sm:h-14", shift: "translate-y-3" },
  { h: "h-10 sm:h-12", shift: "translate-y-8" },
  { h: "h-11 sm:h-12", shift: "-translate-y-4" },
];

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
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-6 py-16 sm:px-10">
      <BrandBackdrop tone="violet" />

      <div className="relative z-10 mx-auto flex w-full max-w-[90rem] flex-1 flex-col items-center justify-center gap-10">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
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
            className="max-w-xl text-lg leading-relaxed text-slate-700"
          >
            {content.body}
          </motion.p>
        </div>

        {/* Organic brand/partner wall - no per-logo cards, natural scatter of sizes and offsets */}
        <div className="flex w-full flex-wrap items-center justify-center gap-x-10 gap-y-6 px-4 sm:gap-x-14 sm:gap-y-10 sm:px-10">
          {content.logos.map((logo, i) => {
            const variant = SCATTER[i % SCATTER.length];
            return (
              <motion.div
                key={logo.name}
                initial={{ opacity: 0, y: 16, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.05 }}
                whileHover={{ scale: 1.08 }}
                className={`relative w-28 shrink-0 sm:w-32 ${variant.h} ${variant.shift}`}
              >
                <Image
                  src={logo.src}
                  alt={logo.name}
                  fill
                  sizes="140px"
                  className="object-contain drop-shadow-[0_4px_10px_rgba(15,23,42,0.08)]"
                />
              </motion.div>
            );
          })}
        </div>

        <SectionNav onPrev={onPrev} onNext={onNext} />
      </div>
    </div>
  );
}
