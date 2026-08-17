"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { IntroCommunityContent } from "@/lib/content/schemas";
import { SectionShell } from "@/components/ecom-intro/SectionShell";
import { SectionNav } from "@/components/ecom-intro/SectionNav";

const TILT = ["-rotate-2", "rotate-2", "-rotate-1", "rotate-1"];

export function CommunitySection({
  content,
  onNext,
  onPrev,
}: {
  content: IntroCommunityContent;
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
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="max-w-xl text-lg leading-relaxed text-slate-600"
      >
        {content.body}
      </motion.p>

      <div className="flex flex-wrap items-end justify-center gap-4">
        {content.photos.map((photo, i) => (
          <motion.figure
            key={photo.name}
            initial={{ opacity: 0, y: 24, rotate: 0 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
            className={`overflow-hidden rounded-2xl border-4 border-white shadow-md ${TILT[i % TILT.length]}`}
          >
            <div className="relative size-28 sm:size-32">
              <Image src={photo.photoSrc} alt={photo.name} fill sizes="128px" className="object-cover" />
            </div>
          </motion.figure>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="flex flex-wrap items-center justify-center gap-2"
      >
        {content.terms.map((term) => (
          <span
            key={term}
            className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600"
          >
            {term}
          </span>
        ))}
      </motion.div>

      <SectionNav onPrev={onPrev} onNext={onNext} />
    </SectionShell>
  );
}
