"use client";

import { motion } from "framer-motion";
import { Award, FileCheck2, GraduationCap, ShieldCheck, type LucideIcon } from "lucide-react";
import type { IntroStudentsContent, IntroTrustContent } from "@/lib/content/schemas";
import { SectionNav } from "@/components/ecom-intro/SectionNav";
import { BrandBackdrop } from "@/components/ecom-intro/BrandBackdrop";
import { StudentPhoto } from "@/components/ecom-intro/StudentPhoto";
import { DotGrid, FilledTriangle, FlowLines, OutlineTriangle } from "@/components/shared/GeometricDecor";
import { cn } from "@/lib/utils";

/** Purely decorative, matched by keyword against our own fixed trust copy - not content-driven. */
const ICON_META: { match: (h: string) => boolean; Icon: LucideIcon; style: string }[] = [
  { match: (h) => h.includes("ISO"), Icon: Award, style: "bg-[var(--brand-purple)]/12 text-[var(--brand-purple)]" },
  { match: (h) => h.includes("משרד העבודה"), Icon: FileCheck2, style: "bg-[var(--brand-green)]/12 text-[var(--brand-green)]" },
  { match: (h) => h.includes("משרד הביטחון"), Icon: ShieldCheck, style: "bg-[var(--brand-teal)]/12 text-[var(--brand-teal)]" },
  { match: (h) => h.includes("פדגוגי"), Icon: GraduationCap, style: "bg-blue-500/12 text-blue-500" },
];

function iconMetaFor(headline: string) {
  return ICON_META.find((m) => m.match(headline)) ?? ICON_META[0];
}

/** Own scatter for this screen - same decorative vocabulary as the other rebuilt screens. */
const TRIANGLES = [
  { kind: "outline", size: 30, pos: "left-[9%] top-[8%]", opacity: 0.28, rotate: -15, color: "text-slate-400" },
  { kind: "filled", size: 18, pos: "left-[7%] top-[19%]", opacity: 0.55, rotate: -10, color: "text-[var(--brand-green)]" },
  { kind: "outline", size: 180, pos: "-right-16 -top-14", opacity: 0.4, rotate: 10, color: "text-[var(--brand-purple)]" },
  { kind: "outline", size: 110, pos: "-left-10 bottom-[6%]", opacity: 0.25, rotate: -8, color: "text-[var(--brand-teal)]" },
  { kind: "outline", size: 24, pos: "right-[22%] top-[36%]", opacity: 0.3, rotate: 12, color: "text-[var(--brand-purple)]" },
] as const;

export function TrustSection({
  content,
  students,
  onNext,
  onPrev,
}: {
  content: IntroTrustContent;
  students: IntroStudentsContent;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-6 py-12 sm:px-10">
      <BrandBackdrop tone="teal" />

      <DotGrid className="left-6 top-8 h-24 w-24 text-slate-400 opacity-[0.3]" />
      <DotGrid className="left-10 bottom-16 h-20 w-20 text-slate-400 opacity-[0.22]" />
      <FlowLines className="-bottom-6 -left-6 -scale-x-100 opacity-[0.5] sm:bottom-0 sm:left-0" />

      {TRIANGLES.map((t, i) =>
        t.kind === "outline" ? (
          <OutlineTriangle key={i} className={cn(t.pos, t.color, `opacity-[${t.opacity}]`)} size={t.size} rotate={t.rotate} />
        ) : (
          <FilledTriangle key={i} className={cn(t.pos, t.color, `opacity-[${t.opacity}]`)} size={t.size} rotate={t.rotate} />
        )
      )}

      {/* Purple glow behind the figure, aqua/green glow on the opposite side */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 hidden h-[34rem] w-[34rem] translate-x-1/4 translate-y-1/4 rounded-full opacity-40 blur-3xl lg:block"
        style={{ background: "radial-gradient(circle, var(--brand-purple) 0%, transparent 72%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 h-[28rem] w-[28rem] -translate-x-1/4 translate-y-1/4 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--brand-teal) 0%, var(--brand-green) 55%, transparent 75%)" }}
      />

      <StudentPhoto
        students={students}
        id="trust-1"
        className="pointer-events-none absolute bottom-0 right-0 z-0 hidden h-[62%] w-auto object-contain object-bottom drop-shadow-[0_20px_40px_rgba(15,23,42,0.15)] lg:block"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <span className="flex items-center gap-2 rounded-full bg-[var(--brand-purple)]/10 px-4 py-1.5 text-xs font-bold text-[var(--brand-purple)]">
            <ShieldCheck className="size-4" />
            אמון ואיכות
          </span>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-4xl font-extrabold text-slate-900 sm:text-5xl"
          >
            {content.headline}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="max-w-xl text-lg leading-relaxed text-slate-700"
          >
            סטנדרטים, פיקוח, איכות והכרה שמחזקים את האמון
          </motion.p>
        </div>

        <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
          {content.items.map((item, i) => {
            const { Icon, style } = iconMetaFor(item.headline);
            return (
              <motion.div
                key={item.headline}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="flex flex-col items-center gap-3 rounded-[2rem] border border-slate-200 bg-white px-8 py-7 text-center shadow-[0_25px_60px_-30px_rgba(15,23,42,0.3)]"
              >
                <span className={cn("flex size-16 items-center justify-center rounded-full", style)}>
                  <Icon className="size-7" />
                </span>
                <span className="text-xl font-extrabold leading-snug text-slate-900">{item.headline}</span>
                <p className="text-base leading-relaxed text-slate-600">{item.explanation}</p>
              </motion.div>
            );
          })}
        </div>

        <SectionNav onPrev={onPrev} onNext={onNext} />
      </div>
    </div>
  );
}
