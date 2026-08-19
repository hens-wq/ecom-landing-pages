"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { EcomIntroContent } from "@/lib/content/loader";
import { IntroAudioProvider, useIntroAudio } from "@/components/ecom-intro/audio/IntroAudioProvider";
import { MusicToggle } from "@/components/ecom-intro/MusicToggle";
import { ProgressIndicator } from "@/components/ecom-intro/ProgressIndicator";
import { WelcomeSection } from "@/components/ecom-intro/sections/WelcomeSection";
import { ArielSection } from "@/components/ecom-intro/sections/ArielSection";
import { IndustrySection } from "@/components/ecom-intro/sections/IndustrySection";
import { StatsSection } from "@/components/ecom-intro/sections/StatsSection";
import { SuccessStoriesSection } from "@/components/ecom-intro/sections/SuccessStoriesSection";
import { AlumniVideosSection } from "@/components/ecom-intro/sections/AlumniVideosSection";
import { InstructorsSection } from "@/components/ecom-intro/sections/InstructorsSection";
import { TrustSection } from "@/components/ecom-intro/sections/TrustSection";
import { ClosingSection } from "@/components/ecom-intro/sections/ClosingSection";

const SECTION_COUNT = 9;

export function IntroExperience({ content, onFinish }: { content: EcomIntroContent; onFinish: () => void }) {
  return (
    <IntroAudioProvider src={content.audio.src}>
      <IntroExperienceInner content={content} onFinish={onFinish} />
    </IntroAudioProvider>
  );
}

function IntroExperienceInner({ content, onFinish }: { content: EcomIntroContent; onFinish: () => void }) {
  const [index, setIndex] = useState(0);
  const { play } = useIntroAudio();

  const next = useCallback(() => setIndex((i) => Math.min(i + 1, SECTION_COUNT - 1)), []);
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  function handleStart() {
    play();
    next();
  }

  // Left/right arrow keys let reps move through the story without reaching for the mouse.
  // The welcome (0) and closing (8) sections keep their own dedicated CTA instead.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (index === 0 || index === SECTION_COUNT - 1) return;
      if (e.key === "ArrowLeft") next();
      if (e.key === "ArrowRight") prev();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, next, prev]);

  const isCinema = index === 5; // AlumniVideosSection runs a dark theme - keep the top bar readable on it too

  return (
    <div className="relative min-h-[100dvh] w-full bg-white">
      {index > 0 && index < SECTION_COUNT - 1 && (
        <div className="fixed inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-4 sm:px-8">
          <ProgressIndicator current={index} total={SECTION_COUNT} dark={isCinema} />
          <MusicToggle />
        </div>
      )}
      {(index === 0 || index === SECTION_COUNT - 1) && (
        <div className="fixed left-5 top-4 z-20 sm:left-8">
          <MusicToggle />
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          {index === 0 && (
            <WelcomeSection content={content.welcome} brand={content.brand} students={content.students} onStart={handleStart} />
          )}
          {index === 1 && (
            <ArielSection content={content.ariel} brand={content.brand} students={content.students} onNext={next} onPrev={prev} />
          )}
          {index === 2 && (
            <IndustrySection content={content.industry} onNext={next} onPrev={prev} />
          )}
          {index === 3 && (
            <StatsSection content={content.stats} industry={content.industry} students={content.students} onNext={next} onPrev={prev} />
          )}
          {index === 4 && <SuccessStoriesSection content={content.alumni} onNext={next} onPrev={prev} />}
          {index === 5 && <AlumniVideosSection content={content.alumni} onNext={next} onPrev={prev} />}
          {index === 6 && <InstructorsSection content={content.instructors} onNext={next} onPrev={prev} />}
          {index === 7 && <TrustSection content={content.trust} students={content.students} onNext={next} onPrev={prev} />}
          {index === 8 && (
            <ClosingSection
              content={content.closing}
              brand={content.brand}
              alumni={content.alumni}
              industry={content.industry}
              students={content.students}
              onPrev={prev}
              onFinish={onFinish}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
