"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import type {
  IntroAlumniContent,
  IntroBrandContent,
  IntroClosingContent,
  IntroIndustryContent,
  IntroStudentsContent,
} from "@/lib/content/schemas";
import { Button } from "@/components/ui/button";
import { BrandBackdrop } from "@/components/ecom-intro/BrandBackdrop";
import { StudentPhoto } from "@/components/ecom-intro/StudentPhoto";
import { OutlineTriangle, FilledTriangle } from "@/components/shared/GeometricDecor";

const CORNER_ALUMNI = [
  { className: "left-[6%] top-[10%] size-28 -rotate-6" },
  { className: "right-[7%] top-[16%] size-24 rotate-6" },
  { className: "left-[10%] bottom-[14%] size-24 rotate-3" },
  { className: "right-[9%] bottom-[10%] size-28 -rotate-3" },
];

export function ClosingSection({
  content,
  brand,
  alumni,
  industry,
  students,
  onPrev,
  onFinish,
}: {
  content: IntroClosingContent;
  brand: IntroBrandContent;
  alumni: IntroAlumniContent;
  industry: IntroIndustryContent;
  students: IntroStudentsContent;
  onPrev: () => void;
  onFinish: () => void;
}) {
  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center overflow-hidden px-6 py-20 text-center sm:px-10">
      <BrandBackdrop tone="sunrise" strong />

      {/* Faded echoes of the journey: alumni faces + a couple of industry logos */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden sm:block">
        {CORNER_ALUMNI.map((c, i) => {
          const person = alumni.stories[i % alumni.stories.length];
          if (!person) return null;
          return (
            <motion.div
              key={person.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.12 }}
              transition={{ duration: 1.2, delay: 0.3 + i * 0.15 }}
              className={`absolute overflow-hidden rounded-3xl blur-[1px] ${c.className}`}
            >
              <Image src={person.photoSrc} alt="" fill className="object-cover" style={{ objectPosition: "50% 15%" }} />
            </motion.div>
          );
        })}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.14 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="absolute left-[16%] top-[42%] h-10 w-24"
        >
          <Image src={industry.logos[0].src} alt="" fill className="object-contain" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.14 }}
          transition={{ duration: 1, delay: 0.65 }}
          className="absolute right-[15%] bottom-[38%] h-10 w-24"
        >
          <Image src={industry.logos[3]?.src ?? industry.logos[0].src} alt="" fill className="object-contain" />
        </motion.div>
      </div>

      <motion.div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        animate={{ rotate: [0, -6, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      >
        <OutlineTriangle className="right-[10%] top-[16%] text-[var(--brand-teal)] opacity-[0.16]" size={72} rotate={16} />
        <OutlineTriangle className="left-[12%] bottom-[16%] text-[var(--brand-purple)] opacity-[0.16]" size={64} rotate={-20} />
        <FilledTriangle className="left-[24%] top-[24%] text-[var(--brand-green)] opacity-[0.2]" size={18} rotate={10} />
        <FilledTriangle className="right-[24%] bottom-[26%] text-[var(--brand-teal)] opacity-[0.18]" size={22} rotate={-16} />
      </motion.div>

      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 size-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.55) 45%, transparent 75%)",
        }}
      />

      <StudentPhoto
        students={students}
        id="closing-1"
        className="pointer-events-none absolute bottom-0 right-0 z-0 hidden h-[75%] w-auto object-contain object-bottom opacity-85 lg:block"
      />
      <StudentPhoto
        students={students}
        id="closing-2"
        className="pointer-events-none absolute bottom-0 left-0 z-0 hidden h-[60%] w-auto object-contain object-bottom opacity-85 lg:block"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center gap-8">
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.94 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <Image
            src={brand.logoStackedSrc}
            alt="Ecom School"
            width={220}
            height={121}
            className="mx-auto h-auto w-40 drop-shadow-[0_8px_30px_rgba(140,82,255,0.25)] sm:w-48"
          />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl font-extrabold leading-tight text-slate-900 sm:text-6xl"
        >
          {content.headline}
        </motion.h2>

        {/* The key takeaway from the whole intro, framed as one panel */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex w-full flex-col gap-3 rounded-3xl border border-[var(--brand-purple)]/15 bg-white/80 p-6 shadow-[0_25px_60px_-35px_rgba(140,82,255,0.4)] backdrop-blur-sm sm:p-8"
        >
          {content.body.map((paragraph, i) => {
            const isLast = i === content.body.length - 1;
            return (
              <p
                key={paragraph}
                className={
                  isLast
                    ? "text-lg font-bold leading-relaxed text-[var(--brand-purple)] sm:text-xl"
                    : "text-lg leading-relaxed text-slate-800 sm:text-xl"
                }
              >
                {paragraph}
              </p>
            );
          })}
        </motion.div>

        {/* What happens now - broken into short onboarding blocks, not one paragraph */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex w-full flex-col items-center gap-4"
        >
          <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[var(--brand-purple)]">
            <Sparkles className="size-4" />
            {content.onboarding.eyebrow}
          </span>
          <div className="flex w-full flex-col gap-3">
            {content.onboarding.steps.map((step, i) => (
              <div
                key={step}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-right shadow-sm"
              >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-purple)]/10 text-sm font-bold text-[var(--brand-purple)]">
                  {i + 1}
                </span>
                <p className="text-base leading-relaxed text-slate-800 sm:text-lg">{step}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/*
          Mount-triggered (animate), not scroll-triggered (whileInView) - this
          is the button that actually finishes the intro, so its visibility
          can never depend on an IntersectionObserver firing in time.
        */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col items-center gap-3"
        >
          <Button
            type="button"
            size="lg"
            onClick={onFinish}
            className="h-14 rounded-full px-12 text-lg shadow-[0_18px_45px_rgba(140,82,255,0.4)] transition-transform hover:scale-[1.03]"
          >
            {content.ctaLabel}
            <ArrowLeft className="size-5" />
          </Button>
          <button type="button" onClick={onPrev} className="text-xs font-medium text-slate-500 hover:text-slate-700">
            חזרה
          </button>
        </motion.div>
      </div>
    </div>
  );
}
