"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import type { IntroBrandContent, IntroWelcomeContent } from "@/lib/content/schemas";
import { Button } from "@/components/ui/button";
import { BrandBackdrop } from "@/components/ecom-intro/BrandBackdrop";
import { OutlineTriangle, FilledTriangle } from "@/components/shared/GeometricDecor";

export function WelcomeSection({
  content,
  brand,
  onStart,
}: {
  content: IntroWelcomeContent;
  brand: IntroBrandContent;
  onStart: () => void;
}) {
  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-6 text-center sm:px-10">
      <BrandBackdrop tone="sunrise" strong />

      {/* Large drifting triangle motifs unique to the hero, echoed faintly at the close */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        animate={{ rotate: [0, 6, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      >
        <OutlineTriangle className="left-[10%] top-[14%] text-[var(--brand-purple)] opacity-[0.16]" size={64} rotate={-12} />
        <OutlineTriangle className="right-[12%] bottom-[18%] text-[var(--brand-teal)] opacity-[0.16]" size={80} rotate={20} />
        <FilledTriangle className="right-[22%] top-[22%] text-[var(--brand-green)] opacity-[0.2]" size={22} rotate={-8} />
        <FilledTriangle className="left-[20%] bottom-[24%] text-[var(--brand-purple)] opacity-[0.18]" size={16} rotate={40} />
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
        transition={{ duration: 0.8, ease: "easeOut" }}
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
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
        className="relative z-10 max-w-4xl text-5xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-7xl"
      >
        {content.headline}
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
        className="relative z-10 mt-6 h-[3px] w-24 rounded-full bg-gradient-to-l from-[var(--brand-purple)] via-[var(--brand-teal)] to-[var(--brand-green)]"
      />

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut", delay: 0.4 }}
        className="relative z-10 mt-6 max-w-2xl text-xl leading-relaxed text-slate-600 sm:text-2xl"
      >
        {content.supportingLine}
      </motion.p>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut", delay: 0.52 }}
        className="relative z-10 mt-3 max-w-xl text-base leading-relaxed text-slate-400"
      >
        {content.additionalLine}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut", delay: 0.68 }}
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

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{ opacity: { delay: 1, duration: 0.6 }, y: { delay: 1.2, duration: 1.8, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-xs font-medium tracking-wide text-slate-400"
      >
        11 מסכים קצרים לפני שמתחילים ללמוד למכור
      </motion.div>
    </div>
  );
}
