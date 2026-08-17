"use client";

import { motion } from "framer-motion";
import { DotGrid, FilledTriangle, OutlineTriangle } from "@/components/shared/GeometricDecor";
import { cn } from "@/lib/utils";

const TONES = {
  violet: { a: "var(--brand-purple)", b: "#5b21b6", c: "var(--brand-teal)" },
  teal: { a: "var(--brand-teal)", b: "var(--brand-purple)", c: "var(--brand-green)" },
  green: { a: "var(--brand-green)", b: "var(--brand-teal)", c: "var(--brand-purple)" },
  sunrise: { a: "#8c52ff", b: "#34d1c3", c: "#85ed72" },
} as const;

export type BackdropTone = keyof typeof TONES;

/**
 * Full-bleed layered atmosphere behind every intro section: a soft mesh
 * wash, large drifting glow fields in the brand palette, oversized
 * triangle motifs and a faint dot-grid texture. Every section gets one of
 * these instead of a plain white slate, so the whole experience reads as
 * one continuous branded space rather than a stack of separate cards.
 */
export function BrandBackdrop({
  tone = "violet",
  strong = false,
  className,
}: {
  tone?: BackdropTone;
  strong?: boolean;
  className?: string;
}) {
  const { a, b, c } = TONES[tone];
  const glowOpacity = strong ? 0.22 : 0.13;

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {/* Base mesh wash */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 90% at 12% -10%, ${a}14 0%, transparent 55%), radial-gradient(100% 80% at 100% 10%, ${c}14 0%, transparent 50%), radial-gradient(90% 70% at 50% 120%, ${b}10 0%, transparent 55%)`,
        }}
      />

      <motion.div
        className="absolute -right-40 -top-40 size-[34rem] rounded-full blur-3xl"
        style={{ background: a, opacity: glowOpacity }}
        animate={{ scale: [1, 1.15, 1], x: [0, 20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-48 -left-32 size-[30rem] rounded-full blur-3xl"
        style={{ background: c, opacity: glowOpacity }}
        animate={{ scale: [1, 1.2, 1], y: [0, -20, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.div
        className="absolute left-1/2 top-1/3 size-96 -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: b, opacity: glowOpacity * 0.8 }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />

      {/* Oversized geometric motifs */}
      <OutlineTriangle className="right-[8%] top-[12%] text-[var(--brand-purple)] opacity-[0.12]" size={120} rotate={8} />
      <OutlineTriangle className="left-[6%] bottom-[16%] text-[var(--brand-teal)] opacity-[0.1]" size={90} rotate={-16} />
      <FilledTriangle className="left-[14%] top-[18%] text-[var(--brand-green)] opacity-[0.14]" size={26} rotate={20} />
      <FilledTriangle className="right-[18%] bottom-[10%] text-[var(--brand-purple)] opacity-[0.12]" size={20} rotate={-30} />

      <DotGrid className="right-10 bottom-10 h-24 w-24 text-[var(--brand-purple)] opacity-[0.12]" />
      <DotGrid className="left-10 top-24 h-20 w-20 text-[var(--brand-teal)] opacity-[0.1]" />
    </div>
  );
}
