"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import type { IntroBrandContent, IntroWelcomeContent } from "@/lib/content/schemas";
import { Button } from "@/components/ui/button";
import { BrandBackdrop } from "@/components/ecom-intro/BrandBackdrop";
import { DotGrid, FilledTriangle, FlowLines, OutlineTriangle } from "@/components/shared/GeometricDecor";
import { DEFAULT_ICON, ICON_MAP } from "@/lib/icon-map";
import { cn } from "@/lib/utils";

/** Positioned/tinted to mirror the approved reference: two large cropped
 * corner triangles for structure, a scatter of small solid ones for
 * confetti-like accents, and a couple of faint pale ones for depth. */
const TRIANGLES = [
  { kind: "outline", size: 210, pos: "-right-16 -top-14", opacity: 0.5, rotate: 12, color: "text-[var(--brand-purple)]" },
  { kind: "outline", size: 180, pos: "-left-16 -bottom-16", opacity: 0.42, rotate: -10, color: "text-[var(--brand-teal)]" },
  { kind: "outline", size: 64, pos: "left-[3%] top-[26%]", opacity: 0.22, rotate: -18, color: "text-slate-400" },
  { kind: "outline", size: 30, pos: "right-[16%] top-[36%]", opacity: 0.28, rotate: 8, color: "text-[var(--brand-purple)]" },
  { kind: "filled", size: 20, pos: "left-[15%] top-[15%]", opacity: 0.85, rotate: 15, color: "text-[var(--brand-green)]" },
  { kind: "outline", size: 24, pos: "right-[9%] top-[10%]", opacity: 0.5, rotate: -10, color: "text-[var(--brand-green)]" },
  { kind: "filled", size: 22, pos: "left-[19%] top-[36%]", opacity: 0.8, rotate: -20, color: "text-[var(--brand-purple)]" },
  { kind: "filled", size: 24, pos: "right-[6%] top-[68%]", opacity: 0.8, rotate: -15, color: "text-[var(--brand-green)]" },
  { kind: "filled", size: 22, pos: "left-[17%] bottom-[9%]", opacity: 0.8, rotate: 20, color: "text-[var(--brand-purple)]" },
] as const;

const FEATURE_COLORS = ["var(--brand-teal)", "var(--brand-teal)", "var(--brand-purple)", "var(--brand-teal)"];

function useParallax(strength = 10): { x: MotionValue<number>; y: MotionValue<number>; onMouseMove: (e: React.MouseEvent) => void } {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 60, damping: 20 });
  const y = useSpring(rawY, { stiffness: 60, damping: 20 });

  function onMouseMove(e: React.MouseEvent) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rawX.set(px * strength);
    rawY.set(py * strength);
  }

  return { x, y, onMouseMove };
}

export function WelcomeSection({
  content,
  brand,
  onStart,
}: {
  content: IntroWelcomeContent;
  brand: IntroBrandContent;
  onStart: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const parallax = useParallax();
  const bgX = useTransform(parallax.x, (v) => v);
  const bgY = useTransform(parallax.y, (v) => v);

  return (
    <div
      ref={containerRef}
      onMouseMove={parallax.onMouseMove}
      className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-6 text-center sm:px-10"
    >
      <BrandBackdrop tone="sunrise" />

      {/* Corner texture: dot grids + flowing lines, mirroring the reference's pale, structured background */}
      <DotGrid className="left-6 top-8 h-24 w-24 text-slate-400 opacity-[0.32]" />
      <DotGrid className="right-8 top-1/3 h-20 w-20 text-slate-400 opacity-[0.24]" />
      <FlowLines className="-bottom-6 -right-6 opacity-[0.55] sm:bottom-0 sm:right-0" />

      {/* Triangle field - gently mouse-reactive, slow independent rotation for restrained life */}
      <motion.div className="pointer-events-none absolute inset-0" aria-hidden style={{ x: bgX, y: bgY }}>
        <motion.div animate={{ rotate: [0, 4, 0] }} transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}>
          {TRIANGLES.slice(0, 5).map((t, i) =>
            t.kind === "outline" ? (
              <OutlineTriangle key={i} className={cn(t.pos, t.color, `opacity-[${t.opacity}]`)} size={t.size} rotate={t.rotate} />
            ) : (
              <FilledTriangle key={i} className={cn(t.pos, t.color, `opacity-[${t.opacity}]`)} size={t.size} rotate={t.rotate} />
            )
          )}
        </motion.div>
        <motion.div animate={{ rotate: [0, -3, 0] }} transition={{ duration: 32, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}>
          {TRIANGLES.slice(5).map((t, i) =>
            t.kind === "outline" ? (
              <OutlineTriangle key={i} className={cn(t.pos, t.color, `opacity-[${t.opacity}]`)} size={t.size} rotate={t.rotate} />
            ) : (
              <FilledTriangle key={i} className={cn(t.pos, t.color, `opacity-[${t.opacity}]`)} size={t.size} rotate={t.rotate} />
            )
          )}
        </motion.div>
      </motion.div>

      {/* Soft white halo behind the central column so it stays crisp against the busier corners */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 size-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-70 blur-3xl"
      />

      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative z-10 mb-2"
      >
        <Image
          src={brand.logoStackedSrc}
          alt="Ecom School"
          width={280}
          height={154}
          priority
          className="mx-auto h-auto w-60 drop-shadow-[0_8px_30px_rgba(140,82,255,0.2)] sm:w-72"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.35 }}
        className="relative z-10 mt-6 h-[3px] w-24 rounded-full bg-gradient-to-l from-[var(--brand-purple)] via-[var(--brand-teal)] to-[var(--brand-green)]"
      />

      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: "easeOut", delay: 0.15 }}
        className="relative z-10 mt-6 max-w-4xl text-5xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-7xl"
      >
        {content.headline}
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.45 }}
        className="relative z-10 mt-6 max-w-2xl text-xl leading-relaxed text-slate-600 sm:text-2xl"
      >
        {content.supportingLine.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </motion.div>

      <div className="relative z-10 mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-3 sm:gap-4">
        {content.features
          .map((feature, i) => ({ feature, i }))
          // Rendered in reverse so the RTL flex row places features[0] on the
          // visual left, matching the approved reference's left-to-right order.
          .reverse()
          .map(({ feature, i }) => {
            const Icon = ICON_MAP[feature.icon] ?? DEFAULT_ICON;
            return (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.65 + i * 0.08 }}
                className="flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-white px-5 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
              >
                <span className="text-sm font-semibold text-slate-800 sm:text-[15px]">{feature.label}</span>
                <Icon className="size-5 shrink-0" style={{ color: FEATURE_COLORS[i % FEATURE_COLORS.length] }} />
              </motion.div>
            );
          })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 1.05 }}
        className="relative z-10 mt-9"
      >
        <div className="relative inline-block">
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 rounded-full blur-xl"
            style={{ background: "var(--brand-purple)" }}
            animate={{ opacity: [0.25, 0.45, 0.25] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <Button
            type="button"
            size="lg"
            onClick={onStart}
            className="h-14 rounded-full px-11 text-lg shadow-[0_16px_40px_rgba(140,82,255,0.35)] transition-transform hover:scale-[1.03]"
          >
            {content.ctaLabel}
            <ArrowLeft className="size-5" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
