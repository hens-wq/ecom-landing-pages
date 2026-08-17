"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import type { IntroAlumniContent } from "@/lib/content/schemas";
import { SectionNav } from "@/components/ecom-intro/SectionNav";
import { BrandBackdrop } from "@/components/ecom-intro/BrandBackdrop";
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
  const [playing, setPlaying] = useState(false);
  const active = withVideo.find((s) => s.id === activeId) ?? withVideo[0];
  const { duck, unduck } = useIntroAudio();

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-6 py-16 sm:px-10">
      <BrandBackdrop tone="violet" strong />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-4xl font-extrabold text-slate-900 sm:text-5xl"
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
        </div>

        <div className="grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-[0.6fr_1fr]">
          {/* Context panel */}
          {active && (
            <motion.div
              key={`ctx-${active.id}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="order-2 flex flex-col items-center gap-6 rounded-[2rem] border border-slate-200 bg-white/80 p-8 text-center shadow-sm backdrop-blur-sm lg:order-1 lg:items-start lg:text-right"
            >
              <div className="relative size-20 overflow-hidden rounded-2xl shadow-md">
                <Image src={active.photoSrc} alt={active.name} fill sizes="80px" className="object-cover" style={{ objectPosition: "50% 15%" }} />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{active.name}</p>
                <span className="mt-2 inline-block rounded-full bg-[var(--brand-purple)]/10 px-4 py-1.5 text-sm font-bold text-[var(--brand-purple)]">
                  {active.course}
                </span>
              </div>

              <div className="flex w-full flex-col gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">בחרו בוגר/ת</p>
                <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
                  {withVideo.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setActiveId(s.id);
                        setPlaying(false);
                      }}
                      className={cn(
                        "relative size-14 overflow-hidden rounded-full border-2 transition-all",
                        s.id === active?.id
                          ? "border-[var(--brand-purple)] shadow-[0_0_0_4px_rgba(140,82,255,0.15)]"
                          : "border-transparent opacity-60 hover:opacity-100"
                      )}
                      aria-label={s.name}
                    >
                      <Image src={s.photoSrc} alt={s.name} fill sizes="56px" className="object-cover" style={{ objectPosition: "50% 15%" }} />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Featured cinematic video panel */}
          {active && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="relative order-1 mx-auto w-full max-w-sm overflow-hidden rounded-[2rem] border-4 border-white shadow-[0_40px_100px_-30px_rgba(140,82,255,0.45)] lg:order-2 lg:max-w-none"
            >
              <div className="relative aspect-[9/16] w-full bg-black lg:aspect-auto lg:h-[32rem]">
                {!playing && (
                  <button
                    type="button"
                    onClick={() => setPlaying(true)}
                    className="group absolute inset-0 z-10 flex items-center justify-center"
                  >
                    <Image src={active.photoSrc} alt={active.name} fill className="object-cover" style={{ objectPosition: "50% 12%" }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/30" />
                    <span className="relative flex size-20 items-center justify-center rounded-full bg-white/90 shadow-2xl transition-transform group-hover:scale-110">
                      <Play className="size-8 translate-x-0.5 text-[var(--brand-purple)]" fill="currentColor" />
                    </span>
                  </button>
                )}
                {playing && (
                  <video
                    key={active.id}
                    src={active.videoSrc}
                    autoPlay
                    controls
                    playsInline
                    className="size-full object-cover"
                    onPlay={duck}
                    onPause={unduck}
                    onEnded={unduck}
                  />
                )}
              </div>
            </motion.div>
          )}
        </div>

        <SectionNav onPrev={onPrev} onNext={onNext} />
      </div>
    </div>
  );
}
