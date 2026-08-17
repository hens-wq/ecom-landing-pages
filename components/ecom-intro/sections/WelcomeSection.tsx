"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import type { IntroBrandContent, IntroWelcomeContent } from "@/lib/content/schemas";
import { Button } from "@/components/ui/button";

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
      {/* Soft brand-color glow field, purely decorative */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -right-32 -top-32 size-[28rem] rounded-full bg-[var(--brand-purple)] opacity-[0.10] blur-3xl"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 -left-24 size-[26rem] rounded-full bg-[var(--brand-teal)] opacity-[0.12] blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div
          className="absolute left-1/3 top-1/4 size-72 rounded-full bg-[var(--brand-green)] opacity-[0.10] blur-3xl"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative z-10 mb-2"
      >
        <Image
          src={brand.logoStackedSrc}
          alt="Ecom School"
          width={220}
          height={121}
          priority
          className="mx-auto h-auto w-40 sm:w-48"
        />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
        className="relative z-10 max-w-3xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl"
      >
        {content.headline}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut", delay: 0.3 }}
        className="relative z-10 max-w-xl text-lg leading-relaxed text-slate-600"
      >
        {content.supportingLine}
      </motion.p>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut", delay: 0.42 }}
        className="relative z-10 max-w-lg text-sm leading-relaxed text-slate-400"
      >
        {content.additionalLine}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut", delay: 0.58 }}
        className="relative z-10 mt-4"
      >
        <Button type="button" size="lg" onClick={onStart} className="px-9">
          {content.ctaLabel}
          <ArrowLeft className="size-4" />
        </Button>
      </motion.div>
    </div>
  );
}
