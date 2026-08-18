"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import type { IntroBrandContent, IntroStudentsContent, IntroWelcomeContent } from "@/lib/content/schemas";
import { Button } from "@/components/ui/button";
import { BrandBackdrop } from "@/components/ecom-intro/BrandBackdrop";
import { StudentPhoto } from "@/components/ecom-intro/StudentPhoto";
import { OutlineTriangle, FilledTriangle } from "@/components/shared/GeometricDecor";

const FLOATING_TERMS = [
  { label: "Cyber", top: "18%", right: "8%", delay: 0 },
  { label: "AI", top: "68%", right: "14%", delay: 1.6 },
  { label: "Full Stack", top: "24%", left: "8%", delay: 3.2 },
  { label: "UX/UI", top: "72%", left: "12%", delay: 4.8 },
  { label: "QA", top: "42%", right: "4%", delay: 6.4 },
  { label: "Digital Marketing", top: "50%", left: "3%", delay: 8 },
];

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
  students,
  onStart,
}: {
  content: IntroWelcomeContent;
  brand: IntroBrandContent;
  students: IntroStudentsContent;
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
      <BrandBackdrop tone="sunrise" strong />

      {/* Slow-drifting triangle motifs, gently mouse-reactive */}
      <motion.div className="pointer-events-none absolute inset-0" aria-hidden style={{ x: bgX, y: bgY }}>
        <motion.div animate={{ rotate: [0, 6, 0] }} transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}>
          <OutlineTriangle className="left-[10%] top-[14%] text-[var(--brand-purple)] opacity-[0.16]" size={64} rotate={-12} />
          <OutlineTriangle className="right-[12%] bottom-[18%] text-[var(--brand-teal)] opacity-[0.16]" size={80} rotate={20} />
          <FilledTriangle className="right-[22%] top-[22%] text-[var(--brand-green)] opacity-[0.2]" size={22} rotate={-8} />
          <FilledTriangle className="left-[20%] bottom-[24%] text-[var(--brand-purple)] opacity-[0.18]" size={16} rotate={40} />
        </motion.div>
      </motion.div>

      {/* Course terms softly fading in and out in the background */}
      <div className="pointer-events-none absolute inset-0 hidden sm:block" aria-hidden>
        {FLOATING_TERMS.map((term) => (
          <motion.span
            key={term.label}
            className="absolute text-lg font-bold text-[var(--brand-purple)] sm:text-xl"
            style={{ top: term.top, left: term.left, right: term.right }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.16, 0.16, 0] }}
            transition={{ duration: 6, repeat: Infinity, repeatDelay: 9.6 - 6, delay: term.delay, ease: "easeInOut" }}
          >
            {term.label}
          </motion.span>
        ))}
      </div>

      {/* Radial glow halo directly behind the wordmark */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 size-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(140,82,255,0.16) 0%, rgba(52,209,195,0.1) 45%, transparent 72%)",
        }}
      />

      <StudentPhoto
        students={students}
        id="welcome-1"
        className="pointer-events-none absolute bottom-0 right-0 z-10 hidden h-[85%] w-auto object-contain object-bottom opacity-90 drop-shadow-2xl lg:block"
      />
      <StudentPhoto
        students={students}
        id="welcome-2"
        className="pointer-events-none absolute bottom-0 left-0 z-0 hidden h-[65%] w-auto object-contain object-bottom opacity-50 blur-[1px] lg:block"
      />

      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative z-10 mb-4"
      >
        <Image
          src={brand.logoStackedSrc}
          alt="Ecom School"
          width={220}
          height={121}
          priority
          className="mx-auto h-auto w-44 drop-shadow-[0_8px_30px_rgba(140,82,255,0.25)] sm:w-56"
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

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.55 }}
        className="relative z-10 mt-6 max-w-xl text-xl leading-relaxed text-slate-700 sm:text-2xl"
      >
        {content.supportingLine}
      </motion.p>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.65 }}
        className="relative z-10 mt-3 max-w-xl text-base leading-relaxed text-slate-600"
      >
        {content.additionalLine}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.8 }}
        className="relative z-10 mt-10"
      >
        <Button
          type="button"
          size="lg"
          onClick={onStart}
          className="h-14 rounded-full px-11 text-lg shadow-[0_16px_40px_rgba(140,82,255,0.35)] transition-transform hover:scale-[1.03]"
        >
          {content.ctaLabel}
          <ArrowLeft className="size-5" />
        </Button>
      </motion.div>
    </div>
  );
}
