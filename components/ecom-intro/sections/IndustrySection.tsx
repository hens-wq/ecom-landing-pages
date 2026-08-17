"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { IntroIndustryContent } from "@/lib/content/schemas";
import { SectionShell } from "@/components/ecom-intro/SectionShell";
import { SectionNav } from "@/components/ecom-intro/SectionNav";

export function IndustrySection({
  content,
  onNext,
  onPrev,
}: {
  content: IntroIndustryContent;
  onNext: () => void;
  onPrev: () => void;
}) {
  // Duplicated once so the marquee track can loop seamlessly at -50%.
  const track = [...content.logos, ...content.logos];

  return (
    <SectionShell maxWidthClassName="max-w-4xl">
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-purple)]"
      >
        {content.alternativeHeadline}
      </motion.p>

      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.05 }}
        className="text-3xl font-extrabold text-slate-900 sm:text-4xl"
      >
        {content.headline}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="max-w-xl text-lg leading-relaxed text-slate-600"
      >
        {content.body}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.25 }}
        className="relative w-full overflow-hidden py-4"
        style={{
          maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        }}
      >
        <div className="flex w-max items-center gap-4 [animation:ecom-marquee_32s_linear_infinite]">
          {track.map((logo, i) => (
            <div
              key={`${logo.name}-${i}`}
              className="flex h-16 w-32 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 shadow-sm sm:h-20 sm:w-40"
            >
              <div className="relative h-8 w-full sm:h-10">
                <Image src={logo.src} alt={logo.name} fill sizes="160px" className="object-contain" />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <SectionNav onPrev={onPrev} onNext={onNext} />
    </SectionShell>
  );
}
