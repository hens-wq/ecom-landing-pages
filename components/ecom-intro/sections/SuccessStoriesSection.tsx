"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import type { IntroAlumniContent } from "@/lib/content/schemas";
import { SectionNav } from "@/components/ecom-intro/SectionNav";
import { BrandBackdrop } from "@/components/ecom-intro/BrandBackdrop";
import { DotGrid, OutlineTriangle } from "@/components/shared/GeometricDecor";
import { cn } from "@/lib/utils";

export function SuccessStoriesSection({
  content,
  onNext,
  onPrev,
}: {
  content: IntroAlumniContent;
  onNext: () => void;
  onPrev: () => void;
}) {
  const { stories } = content;
  const [index, setIndex] = useState(0);
  const story = stories[index];

  function go(delta: number) {
    setIndex((i) => (i + delta + stories.length) % stories.length);
  }

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-6 py-20 sm:px-10">
      <BrandBackdrop tone="teal" />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-4xl font-extrabold text-slate-900 sm:text-5xl"
          >
            {content.successStories.headline}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-lg text-slate-600"
          >
            {content.successStories.supportingLine}
          </motion.p>
        </div>

        <div className="flex w-full items-center justify-center gap-4 sm:gap-6">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="הבוגר הקודם"
            className="flex size-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md transition-colors hover:text-[var(--brand-purple)]"
          >
            <ChevronRight className="size-5" />
          </button>

          <div className="relative w-full max-w-3xl overflow-hidden rounded-[2.5rem] border border-white/60 bg-white shadow-[0_35px_90px_-35px_rgba(52,209,195,0.4)]">
            <AnimatePresence mode="wait">
              <motion.div
                key={story.id}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.35 }}
                className="grid grid-cols-1 sm:grid-cols-[0.85fr_1.15fr] sm:items-stretch"
              >
                <div className="relative h-72 sm:h-[24rem]">
                  <Image
                    src={story.photoSrc}
                    alt={story.name}
                    fill
                    sizes="(min-width: 640px) 40vw, 100vw"
                    className="object-cover"
                    style={{ objectPosition: "50% 15%" }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent sm:bg-gradient-to-l" />
                </div>

                <div className="relative flex flex-col items-start justify-center gap-5 overflow-hidden p-8 text-right sm:h-[24rem] sm:p-10">
                  <DotGrid className="right-6 top-6 h-14 w-14 text-[var(--brand-teal)] opacity-20" />
                  <OutlineTriangle className="-bottom-8 -left-8 text-[var(--brand-purple)] opacity-[0.1]" size={120} rotate={18} />

                  <span className="relative text-xs font-bold tracking-[0.2em] text-slate-300">
                    0{index + 1} / 0{stories.length}
                  </span>
                  <Quote className="relative size-10 text-[var(--brand-teal)] opacity-40" />
                  <div className="relative">
                    <p className="text-3xl font-extrabold text-slate-900">{story.name}</p>
                    <span className="mt-3 inline-block rounded-full bg-[var(--brand-purple)]/10 px-4 py-1.5 text-sm font-bold text-[var(--brand-purple)]">
                      {story.course}
                    </span>
                  </div>
                  {story.quote && <p className="relative text-base leading-relaxed text-slate-600">&ldquo;{story.quote}&rdquo;</p>}
                  {story.story && <p className="relative text-sm leading-relaxed text-slate-500">{story.story}</p>}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={() => go(1)}
            aria-label="הבוגר הבא"
            className="flex size-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-md transition-colors hover:text-[var(--brand-purple)]"
          >
            <ChevronLeft className="size-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {stories.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={s.name}
              className={cn(
                "h-2 rounded-full transition-all",
                i === index ? "w-8 bg-[var(--brand-purple)]" : "w-2 bg-slate-300 hover:bg-slate-400"
              )}
            />
          ))}
        </div>

        <SectionNav onPrev={onPrev} onNext={onNext} />
      </div>
    </div>
  );
}
