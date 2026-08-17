"use client";

import { motion } from "framer-motion";
import { Award, FileCheck2, GraduationCap, MessageSquareText, ShieldCheck, Star, Target, type LucideIcon } from "lucide-react";
import type { IntroTrustContent } from "@/lib/content/schemas";
import { SectionNav } from "@/components/ecom-intro/SectionNav";
import { BrandBackdrop } from "@/components/ecom-intro/BrandBackdrop";

/** Purely decorative, matched by keyword against our own fixed trust copy - not content-driven. */
function iconFor(item: string): LucideIcon {
  if (item.includes("ISO")) return Award;
  if (item.includes("משרד העבודה")) return FileCheck2;
  if (item.includes("משרד הביטחון")) return ShieldCheck;
  if (item.includes("פדגוגי")) return GraduationCap;
  if (item.includes("ביקורות")) return MessageSquareText;
  if (item.includes("/5")) return Star;
  if (item.includes("%")) return Target;
  return Award;
}

export function TrustSection({
  content,
  onNext,
  onPrev,
}: {
  content: IntroTrustContent;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-6 py-20 sm:px-10">
      <BrandBackdrop tone="teal" strong />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-12 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl font-extrabold text-slate-900 sm:text-5xl"
        >
          {content.headline}
        </motion.h2>

        <div className="grid w-full grid-cols-2 gap-5 sm:grid-cols-4">
          {content.items.map((item, i) => {
            const Icon = iconFor(item);
            return (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                className="flex flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white px-5 py-8 text-center shadow-[0_20px_50px_-30px_rgba(15,23,42,0.3)]"
              >
                <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand-teal)]/15 to-[var(--brand-purple)]/10 text-[var(--brand-teal)]">
                  <Icon className="size-6" />
                </span>
                <span className="text-sm font-bold leading-snug text-slate-800">{item}</span>
              </motion.div>
            );
          })}
        </div>

        <SectionNav onPrev={onPrev} onNext={onNext} />
      </div>
    </div>
  );
}
