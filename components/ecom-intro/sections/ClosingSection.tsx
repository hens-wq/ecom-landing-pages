"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import type { IntroBrandContent, IntroClosingContent } from "@/lib/content/schemas";
import { Button } from "@/components/ui/button";
import { BrandBackdrop } from "@/components/ecom-intro/BrandBackdrop";
import { OutlineTriangle, FilledTriangle } from "@/components/shared/GeometricDecor";

export function ClosingSection({
  content,
  brand,
  onPrev,
  onFinish,
}: {
  content: IntroClosingContent;
  brand: IntroBrandContent;
  onPrev: () => void;
  onFinish: () => void;
}) {
  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-6 py-20 text-center sm:px-10">
      <BrandBackdrop tone="sunrise" strong />

      <motion.div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        animate={{ rotate: [0, -6, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      >
        <OutlineTriangle className="right-[10%] top-[16%] text-[var(--brand-teal)] opacity-[0.16]" size={72} rotate={16} />
        <OutlineTriangle className="left-[12%] bottom-[16%] text-[var(--brand-purple)] opacity-[0.16]" size={64} rotate={-20} />
        <FilledTriangle className="left-[24%] top-[24%] text-[var(--brand-green)] opacity-[0.2]" size={18} rotate={10} />
        <FilledTriangle className="right-[24%] bottom-[26%] text-[var(--brand-teal)] opacity-[0.18]" size={22} rotate={-16} />
      </motion.div>

      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 size-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(52,209,195,0.16) 0%, rgba(140,82,255,0.12) 45%, transparent 72%)",
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center gap-7">
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.9 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="flex size-20 items-center justify-center rounded-3xl bg-white shadow-[0_20px_50px_-20px_rgba(140,82,255,0.5)]"
        >
          <Image src={brand.logoMarkSrc} alt="Ecom" width={56} height={56} className="h-11 w-11" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl font-extrabold leading-tight text-slate-900 sm:text-6xl"
        >
          {content.headline}
        </motion.h2>

        <div className="flex max-w-xl flex-col gap-3">
          {content.body.map((paragraph, i) => (
            <motion.p
              key={paragraph}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.22 + i * 0.1 }}
              className="text-xl leading-relaxed text-slate-600"
            >
              {paragraph}
            </motion.p>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="text-base font-bold tracking-wide text-[var(--brand-purple)]"
        >
          {content.supportingLine}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.55 }}
          className="mt-4 flex flex-col items-center gap-3"
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
          <button type="button" onClick={onPrev} className="text-xs font-medium text-slate-400 hover:text-slate-600">
            חזרה
          </button>
        </motion.div>
      </div>
    </div>
  );
}
