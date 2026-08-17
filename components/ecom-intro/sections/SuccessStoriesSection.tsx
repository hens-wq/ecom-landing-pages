"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { IntroAlumniContent } from "@/lib/content/schemas";
import { SectionShell } from "@/components/ecom-intro/SectionShell";
import { SectionNav } from "@/components/ecom-intro/SectionNav";
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
    <SectionShell maxWidthClassName="max-w-2xl">
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-3xl font-extrabold text-slate-900 sm:text-4xl"
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

      <div className="flex w-full items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="הבוגר הקודם"
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:text-[var(--brand-purple)]"
        >
          <ChevronRight className="size-5" />
        </button>

        <div className="relative h-80 w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <AnimatePresence mode="wait">
            <motion.div
              key={story.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35 }}
              className="absolute inset-0 flex flex-col"
            >
              <div className="relative h-56 w-full">
                <Image src={story.photoSrc} alt={story.name} fill sizes="384px" className="object-cover" />
              </div>
              <div className="flex flex-1 flex-col items-center justify-center gap-1 px-4">
                <p className="text-lg font-bold text-slate-900">{story.name}</p>
                <span className="rounded-full bg-[var(--brand-purple)]/8 px-3 py-1 text-xs font-semibold text-[var(--brand-purple)]">
                  {story.course}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={() => go(1)}
          aria-label="הבוגר הבא"
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:text-[var(--brand-purple)]"
        >
          <ChevronLeft className="size-5" />
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        {stories.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={s.name}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === index ? "w-6 bg-[var(--brand-purple)]" : "w-1.5 bg-slate-200"
            )}
          />
        ))}
      </div>

      <SectionNav onPrev={onPrev} onNext={onNext} />
    </SectionShell>
  );
}
