"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import type { IntroAlumniContent } from "@/lib/content/schemas";
import { SectionShell } from "@/components/ecom-intro/SectionShell";
import { SectionNav } from "@/components/ecom-intro/SectionNav";
import { useIntroAudio } from "@/components/ecom-intro/audio/IntroAudioProvider";
import { cn } from "@/lib/utils";

export function AlumniVideosSection({
  content,
  onNext,
  onPrev,
}: {
  content: IntroAlumniContent;
  onNext: () => void;
  onPrev: () => void;
}) {
  const withVideo = content.stories.filter((s) => s.videoSrc);
  const [activeId, setActiveId] = useState(withVideo[0]?.id);
  const active = withVideo.find((s) => s.id === activeId) ?? withVideo[0];
  const { duck, unduck } = useIntroAudio();

  return (
    <SectionShell maxWidthClassName="max-w-2xl">
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-3xl font-extrabold text-slate-900 sm:text-4xl"
      >
        {content.videosSection.headline}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-lg text-slate-600"
      >
        {content.videosSection.supportingLine}
      </motion.p>

      {active && (
        <div className="w-full max-w-xs overflow-hidden rounded-3xl border border-slate-200 bg-black shadow-lg">
          <video
            key={active.id}
            src={active.videoSrc}
            poster={active.photoSrc}
            controls
            playsInline
            className="aspect-[9/16] w-full bg-black"
            onPlay={duck}
            onPause={unduck}
            onEnded={unduck}
          />
        </div>
      )}

      <div className="flex items-center justify-center gap-3">
        {withVideo.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveId(s.id)}
            className={cn(
              "relative size-14 overflow-hidden rounded-full border-2 transition-colors sm:size-16",
              s.id === active?.id ? "border-[var(--brand-purple)]" : "border-transparent opacity-70 hover:opacity-100"
            )}
            aria-label={s.name}
          >
            <Image src={s.photoSrc} alt={s.name} fill sizes="64px" className="object-cover" />
          </button>
        ))}
      </div>
      {active && (
        <p className="text-sm font-medium text-slate-500">
          {active.name} · {active.course}
        </p>
      )}

      <SectionNav onPrev={onPrev} onNext={onNext} />
    </SectionShell>
  );
}
