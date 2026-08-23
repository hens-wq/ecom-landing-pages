"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft, GraduationCap, MessageCircle, RefreshCw, Rocket, Target, type LucideIcon } from "lucide-react";
import type { IntroBrandContent, IntroClosingContent, IntroStudentsContent } from "@/lib/content/schemas";
import { Button } from "@/components/ui/button";
import { BrandBackdrop } from "@/components/ecom-intro/BrandBackdrop";
import { StudentPhoto } from "@/components/ecom-intro/StudentPhoto";
import { DotGrid, FilledTriangle, FlowLines, OutlineTriangle } from "@/components/shared/GeometricDecor";
import { cn } from "@/lib/utils";

const STEP_ICONS: LucideIcon[] = [Rocket, GraduationCap, RefreshCw, MessageCircle, Target];

/** Own scatter for this screen - same decorative vocabulary as the other rebuilt screens. */
const TRIANGLES = [
  { kind: "outline", size: 28, pos: "left-[8%] top-[6%]", opacity: 0.28, rotate: -15, color: "text-slate-400" },
  { kind: "filled", size: 16, pos: "left-[13%] top-[15%]", opacity: 0.55, rotate: -10, color: "text-[var(--brand-green)]" },
  { kind: "outline", size: 170, pos: "-right-16 -top-14", opacity: 0.35, rotate: 10, color: "text-[var(--brand-purple)]" },
  { kind: "filled", size: 20, pos: "right-[9%] top-[9%]", opacity: 0.45, rotate: 15, color: "text-[var(--brand-purple)]" },
  { kind: "outline", size: 22, pos: "right-[5%] top-[30%]", opacity: 0.3, rotate: -12, color: "text-[var(--brand-teal)]" },
] as const;

export function ClosingSection({
  content,
  brand,
  students,
  onPrev,
  onFinish,
}: {
  content: IntroClosingContent;
  brand: IntroBrandContent;
  students: IntroStudentsContent;
  onPrev: () => void;
  onFinish: () => void;
}) {
  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center overflow-hidden px-6 py-12 text-center sm:px-10">
      <BrandBackdrop tone="sunrise" />

      <DotGrid className="left-6 top-8 h-24 w-24 text-slate-400 opacity-[0.3]" />
      <FlowLines className="-left-6 -top-6 opacity-[0.4]" />
      <FlowLines className="-right-6 -top-6 -scale-x-100 opacity-[0.35]" />

      {TRIANGLES.map((t, i) =>
        t.kind === "outline" ? (
          <OutlineTriangle key={i} className={cn(t.pos, t.color, `opacity-[${t.opacity}]`)} size={t.size} rotate={t.rotate} />
        ) : (
          <FilledTriangle key={i} className={cn(t.pos, t.color, `opacity-[${t.opacity}]`)} size={t.size} rotate={t.rotate} />
        )
      )}

      {/* Purple glow behind the female figure, aqua/green glow behind the male figure */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 hidden h-[30rem] w-[30rem] -translate-x-1/4 translate-y-1/4 rounded-full opacity-35 blur-3xl lg:block"
        style={{ background: "radial-gradient(circle, var(--brand-purple) 0%, transparent 72%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 hidden h-[30rem] w-[30rem] translate-x-1/4 translate-y-1/4 rounded-full opacity-30 blur-3xl lg:block"
        style={{ background: "radial-gradient(circle, var(--brand-teal) 0%, var(--brand-green) 55%, transparent 75%)" }}
      />

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
        className="pointer-events-none absolute bottom-0 right-0 z-0 hidden h-[78%] w-auto object-contain object-bottom drop-shadow-[0_20px_40px_rgba(15,23,42,0.15)] lg:block"
      />
      <StudentPhoto
        students={students}
        id="closing-2"
        className="pointer-events-none absolute bottom-0 left-0 z-0 hidden h-[72%] w-auto object-contain object-bottom drop-shadow-[0_20px_40px_rgba(15,23,42,0.15)] lg:block"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6">
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
            className="mx-auto h-auto w-36 drop-shadow-[0_8px_30px_rgba(140,82,255,0.25)] sm:w-44"
          />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl"
        >
          {content.headline}
        </motion.h2>

        {/* The key takeaway from the whole intro, framed as one panel */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex w-full flex-col gap-2.5 rounded-[2rem] border border-[var(--brand-purple)]/15 bg-[var(--brand-purple)]/[0.04] p-6 shadow-[0_25px_60px_-35px_rgba(140,82,255,0.4)] sm:p-7"
        >
          {content.body.map((paragraph, i) => {
            const isLast = i === content.body.length - 1;
            return (
              <p
                key={paragraph}
                className={
                  isLast
                    ? "text-base font-bold leading-relaxed text-[var(--brand-purple)] sm:text-lg"
                    : "text-base leading-relaxed text-slate-800 sm:text-lg"
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
          <div className="flex w-full max-w-sm items-center gap-3">
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--brand-teal)]/50" />
            <span className="flex items-center gap-1.5 text-base font-extrabold text-slate-900">
              {content.onboarding.eyebrow}
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--brand-teal)]/50" />
          </div>
          <div className="flex w-full flex-col gap-2.5">
            {content.onboarding.steps.map((step, i) => {
              const Icon = STEP_ICONS[i % STEP_ICONS.length];
              return (
                <div
                  key={step}
                  className="flex w-full items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2.5 shadow-sm sm:gap-4 sm:px-4"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-l from-[var(--brand-purple)] via-[var(--brand-teal)] to-[var(--brand-green)] text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <p className="flex-1 text-center text-sm leading-snug text-slate-800 sm:text-base">{step}</p>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-purple)]/10 text-[var(--brand-purple)]">
                    <Icon className="size-4.5" />
                  </span>
                </div>
              );
            })}
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
