"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import type { IntroCommunityContent } from "@/lib/content/schemas";
import { SectionNav } from "@/components/ecom-intro/SectionNav";
import { BrandBackdrop } from "@/components/ecom-intro/BrandBackdrop";

const PANEL_SIZES = ["sm:row-span-2", "", "", "sm:row-span-2"];

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
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-6 py-20 sm:px-10">
      <BrandBackdrop tone="sunrise" />

      <div className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        {/* Photo mosaic */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 gap-3 sm:grid-rows-2"
        >
          {content.photos.map((photo, i) => (
            <motion.figure
              key={photo.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              whileHover={{ scale: 1.02 }}
              className={`relative overflow-hidden rounded-3xl border-2 border-white shadow-[0_20px_50px_-25px_rgba(140,82,255,0.4)] ${PANEL_SIZES[i % PANEL_SIZES.length]}`}
              style={{ aspectRatio: PANEL_SIZES[i % PANEL_SIZES.length] ? "3/4" : "4/3" }}
            >
              <Image src={photo.photoSrc} alt={photo.name} fill sizes="240px" className="object-cover" style={{ objectPosition: "50% 15%" }} />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent px-4 py-3">
                <span className="text-sm font-bold text-white drop-shadow">{photo.name}</span>
              </div>
            </motion.figure>
          ))}
        </motion.div>

        {/* Text + community pulse panel */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-col items-start gap-6 text-right"
        >
          <span className="flex items-center gap-2 rounded-full bg-[var(--brand-purple)]/10 px-4 py-1.5 text-xs font-bold text-[var(--brand-purple)]">
            <Users className="size-4" />
            קהילת הבוגרים
          </span>
          <h2 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">{content.headline}</h2>
          <p className="max-w-xl text-lg leading-relaxed text-slate-600">{content.body}</p>

          <div className="flex flex-wrap justify-end gap-2.5">
            {content.terms.map((term, i) => (
              <motion.span
                key={term}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.06 }}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm"
              >
                {term}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="relative z-10 mt-10">
        <SectionNav onPrev={onPrev} onNext={onNext} />
      </div>
    </div>
  );
}
