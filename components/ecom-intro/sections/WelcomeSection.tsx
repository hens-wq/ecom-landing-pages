"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import type { IntroBrandContent, IntroWelcomeContent } from "@/lib/content/schemas";
import { Button } from "@/components/ui/button";
import { BrandBackdrop } from "@/components/ecom-intro/BrandBackdrop";
import { OutlineTriangle, FilledTriangle } from "@/components/shared/GeometricDecor";
import { cn } from "@/lib/utils";

const BRAND_COLORS = ["text-[var(--brand-purple)]", "text-[var(--brand-teal)]", "text-[var(--brand-green)]"];

/** A wider field of triangles than the small corner accents elsewhere - some sharp, some pushed soft into the background. */
const TRIANGLES = [
  { kind: "outline", size: 100, pos: "left-[9%] top-[9%]", opacity: 0.14, rotate: -15, blur: "" },
  { kind: "outline", size: 150, pos: "-right-10 -top-10", opacity: 0.1, rotate: 12, blur: "blur-sm" },
  { kind: "filled", size: 20, pos: "left-[24%] top-[20%]", opacity: 0.2, rotate: 20, blur: "" },
  { kind: "outline", size: 60, pos: "right-[16%] top-[26%]", opacity: 0.16, rotate: -25, blur: "" },
  { kind: "filled", size: 30, pos: "left-[6%] top-[52%]", opacity: 0.12, rotate: 40, blur: "blur-[2px]" },
  { kind: "outline", size: 170, pos: "-left-14 -bottom-14", opacity: 0.08, rotate: -10, blur: "blur-md" },
  { kind: "outline", size: 80, pos: "right-[10%] bottom-[16%]", opacity: 0.15, rotate: 30, blur: "" },
  { kind: "filled", size: 16, pos: "left-[30%] bottom-[22%]", opacity: 0.2, rotate: -18, blur: "" },
  { kind: "outline", size: 44, pos: "right-[30%] top-[10%]", opacity: 0.18, rotate: 8, blur: "" },
];

/** Not navigation - pure atmosphere, so the page feels like the Ecom world without needing people. */
const WORLD_CHIPS = [
  { label: "Cyber", pos: "left-[8%] top-[13%]", tier: "visible" as const, delay: 0 },
  { label: "AI", pos: "right-[9%] top-[19%]", tier: "subtle" as const, delay: 0.7 },
  { label: "DevOps", pos: "left-[36%] top-[7%]", tier: "faded" as const, delay: 1.4 },
  { label: "Full Stack", pos: "left-[5%] top-[46%]", tier: "faded" as const, delay: 2.1 },
  { label: "UX/UI", pos: "right-[6%] top-[50%]", tier: "visible" as const, delay: 2.8 },
  { label: "Digital Marketing & Data", pos: "right-[10%] bottom-[14%]", tier: "subtle" as const, delay: 3.5 },
  { label: "QA", pos: "left-[10%] bottom-[12%]", tier: "visible" as const, delay: 4.2 },
];

const CHIP_TIERS = {
  visible: "border-white/70 bg-white/55 text-slate-800 opacity-90",
  subtle: "border-white/50 bg-white/35 text-slate-600 opacity-55",
  faded: "border-white/40 bg-white/20 text-slate-500 opacity-35 blur-[0.5px]",
};

function useParallax(strength = 14): { x: MotionValue<number>; y: MotionValue<number>; onMouseMove: (e: React.MouseEvent) => void } {
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
  const chipX = useTransform(parallax.x, (v) => v * 0.5);
  const chipY = useTransform(parallax.y, (v) => v * 0.5);

  return (
    <div
      ref={containerRef}
      onMouseMove={parallax.onMouseMove}
      className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-6 text-center sm:px-10"
    >
      <BrandBackdrop tone="sunrise" strong />

      {/* Wider triangle field - gently mouse-reactive, two independent slow rotations for a less mechanical feel */}
      <motion.div className="pointer-events-none absolute inset-0" aria-hidden style={{ x: bgX, y: bgY }}>
        <motion.div animate={{ rotate: [0, 5, 0] }} transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}>
          {TRIANGLES.slice(0, 5).map((t, i) =>
            t.kind === "outline" ? (
              <OutlineTriangle
                key={i}
                className={cn(t.pos, BRAND_COLORS[i % BRAND_COLORS.length], `opacity-[${t.opacity}]`, t.blur)}
                size={t.size}
                rotate={t.rotate}
              />
            ) : (
              <FilledTriangle
                key={i}
                className={cn(t.pos, BRAND_COLORS[i % BRAND_COLORS.length], `opacity-[${t.opacity}]`, t.blur)}
                size={t.size}
                rotate={t.rotate}
              />
            )
          )}
        </motion.div>
        <motion.div animate={{ rotate: [0, -4, 0] }} transition={{ duration: 32, repeat: Infinity, ease: "easeInOut", delay: 2 }}>
          {TRIANGLES.slice(5).map((t, i) =>
            t.kind === "outline" ? (
              <OutlineTriangle
                key={i}
                className={cn(t.pos, BRAND_COLORS[(i + 1) % BRAND_COLORS.length], `opacity-[${t.opacity}]`, t.blur)}
                size={t.size}
                rotate={t.rotate}
              />
            ) : (
              <FilledTriangle
                key={i}
                className={cn(t.pos, BRAND_COLORS[(i + 1) % BRAND_COLORS.length], `opacity-[${t.opacity}]`, t.blur)}
                size={t.size}
                rotate={t.rotate}
              />
            )
          )}
        </motion.div>
      </motion.div>

      {/* Floating glass chips - the Ecom learning world, as atmosphere rather than navigation */}
      <motion.div className="pointer-events-none absolute inset-0 hidden sm:block" aria-hidden style={{ x: chipX, y: chipY }}>
        {WORLD_CHIPS.map((chip) => (
          <motion.div
            key={chip.label}
            className={cn("absolute", chip.pos)}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: [0, -10, 0] }}
            transition={{
              opacity: { duration: 0.9, delay: chip.delay },
              y: { duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: chip.delay },
            }}
          >
            <span
              className={cn(
                "flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-bold backdrop-blur-md sm:text-sm",
                CHIP_TIERS[chip.tier]
              )}
            >
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: `var(--brand-${["purple", "teal", "green"][chip.label.length % 3]})` }}
              />
              {chip.label}
            </span>
          </motion.div>
        ))}
      </motion.div>

      {/* Radial glow halo directly behind the wordmark */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 size-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(140,82,255,0.16) 0%, rgba(52,209,195,0.1) 45%, transparent 72%)",
        }}
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
          width={260}
          height={143}
          priority
          className="mx-auto h-auto w-52 drop-shadow-[0_8px_30px_rgba(140,82,255,0.25)] sm:w-64"
        />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: "easeOut", delay: 0.2 }}
        className="relative z-10 max-w-4xl text-5xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-7xl"
      >
        {content.headline}
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.45 }}
        className="relative z-10 mt-6 h-[3px] w-24 rounded-full bg-gradient-to-l from-[var(--brand-purple)] via-[var(--brand-teal)] to-[var(--brand-green)]"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.55 }}
        className="relative z-10 mt-6 max-w-2xl text-xl leading-relaxed text-slate-700 sm:text-2xl"
      >
        {content.supportingLine.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.8 }}
        className="relative z-10 mt-10"
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
