"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Briefcase, Code2, Megaphone, ShieldCheck, type LucideIcon } from "lucide-react";
import type { IntroInstructorsContent } from "@/lib/content/schemas";
import { SectionNav } from "@/components/ecom-intro/SectionNav";
import { BrandBackdrop } from "@/components/ecom-intro/BrandBackdrop";
import { DotGrid, FilledTriangle, FlowLines, OutlineTriangle } from "@/components/shared/GeometricDecor";
import { cn } from "@/lib/utils";

const COURSE_ICONS: Record<string, LucideIcon> = {
  "Full Stack": Code2,
  Cyber: ShieldCheck,
  "Digital Marketing": Megaphone,
};

const CARD_ACCENTS = [
  "from-[var(--brand-purple)] via-[var(--brand-teal)] to-[var(--brand-green)]",
  "from-[var(--brand-teal)] via-[var(--brand-green)] to-[var(--brand-purple)]",
  "from-[var(--brand-green)] via-[var(--brand-purple)] to-[var(--brand-teal)]",
  "from-[var(--brand-purple)] via-[var(--brand-green)] to-[var(--brand-teal)]",
];

/** Own scatter for this screen - same decorative vocabulary as the other rebuilt screens, larger/bolder to fill the wider composition. */
const TRIANGLES = [
  { kind: "outline", size: 34, pos: "left-[9%] top-[8%]", opacity: 0.28, rotate: -15, color: "text-slate-400" },
  { kind: "outline", size: 170, pos: "-right-14 -top-16", opacity: 0.4, rotate: 10, color: "text-[var(--brand-purple)]" },
  { kind: "filled", size: 40, pos: "right-[9%] top-[10%]", opacity: 0.2, rotate: -10, color: "text-[var(--brand-teal)]" },
  { kind: "outline", size: 110, pos: "-left-10 top-[38%]", opacity: 0.22, rotate: -8, color: "text-[var(--brand-purple)]" },
  { kind: "outline", size: 26, pos: "right-[3%] top-[58%]", opacity: 0.3, rotate: 12, color: "text-[var(--brand-teal)]" },
  { kind: "filled", size: 16, pos: "left-[10%] bottom-[10%]", opacity: 0.5, rotate: -20, color: "text-[var(--brand-green)]" },
] as const;

export function InstructorsSection({
  content,
  onNext,
  onPrev,
}: {
  content: IntroInstructorsContent;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-6 py-14 sm:px-10">
      <BrandBackdrop tone="green" />

      <DotGrid className="left-6 top-8 h-24 w-24 text-slate-400 opacity-[0.3]" />
      <DotGrid className="right-10 bottom-10 h-20 w-20 text-slate-400 opacity-[0.22]" />
      <FlowLines className="-right-6 -top-6 -scale-y-100 opacity-[0.45]" />

      {TRIANGLES.map((t, i) =>
        t.kind === "outline" ? (
          <OutlineTriangle key={i} className={cn(t.pos, t.color, `opacity-[${t.opacity}]`)} size={t.size} rotate={t.rotate} />
        ) : (
          <FilledTriangle key={i} className={cn(t.pos, t.color, `opacity-[${t.opacity}]`)} size={t.size} rotate={t.rotate} />
        )
      )}

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-10 text-center">
        <div className="flex flex-col items-center gap-4">
          <span className="flex items-center gap-2 rounded-full bg-[var(--brand-purple)]/10 px-4 py-1.5 text-xs font-bold text-[var(--brand-purple)]">
            <Briefcase className="size-4" />
            אנשי מקצוע מהתעשייה
          </span>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-5xl font-extrabold leading-[1.1] text-slate-900 sm:text-6xl"
          >
            {content.headline}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="max-w-2xl text-lg leading-relaxed text-slate-700"
          >
            {content.body}
          </motion.p>
        </div>

        <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
          {content.instructors.map((instructor, i) => {
            const CourseIcon = (instructor.course && COURSE_ICONS[instructor.course]) || Briefcase;
            return (
              <motion.div
                key={instructor.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className="group relative flex items-center gap-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 text-right shadow-[0_20px_50px_-25px_rgba(15,23,42,0.18)] transition-shadow hover:shadow-xl sm:p-7"
              >
                <span
                  className={cn(
                    "absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-l",
                    CARD_ACCENTS[i % CARD_ACCENTS.length]
                  )}
                />

                <div className="relative h-44 w-36 shrink-0 overflow-hidden rounded-2xl sm:h-52 sm:w-40">
                  <Image
                    src={instructor.photoSrc}
                    alt={instructor.name}
                    fill
                    sizes="160px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    style={{ objectPosition: "50% 15%" }}
                  />
                  <span className="absolute -bottom-2 -left-2 flex size-11 items-center justify-center rounded-full border border-slate-100 bg-white text-[var(--brand-teal)] shadow-md">
                    <CourseIcon className="size-5" />
                  </span>
                </div>

                <div className="flex flex-1 flex-col items-start gap-2">
                  {instructor.course && (
                    <span className="rounded-full bg-[var(--brand-purple)]/10 px-3 py-1 text-xs font-bold text-[var(--brand-purple)]">
                      {instructor.course}
                    </span>
                  )}
                  <span className="text-xl font-extrabold text-slate-900 sm:text-2xl">{instructor.name}</span>
                  {instructor.role && (
                    <span className="text-sm font-bold text-[var(--brand-teal)] sm:text-base">{instructor.role}</span>
                  )}
                  {instructor.description && (
                    <p className="text-sm leading-relaxed text-slate-600">{instructor.description}</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <SectionNav onPrev={onPrev} onNext={onNext} />
      </div>
    </div>
  );
}
