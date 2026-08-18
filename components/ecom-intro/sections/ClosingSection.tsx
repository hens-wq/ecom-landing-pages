"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import type {
  IntroAlumniContent,
  IntroBrandContent,
  IntroClosingContent,
  IntroIndustryContent,
  IntroStudentsContent,
} from "@/lib/content/schemas";
import { Button } from "@/components/ui/button";
import { BrandBackdrop } from "@/components/ecom-intro/BrandBackdrop";
import { StudentPhoto } from "@/components/ecom-intro/StudentPhoto";
import { OutlineTriangle, FilledTriangle } from "@/components/shared/GeometricDecor";

const CORNER_ALUMNI = [
  { className: "left-[6%] top-[10%] size-28 -rotate-6" },
  { className: "right-[7%] top-[16%] size-24 rotate-6" },
  { className: "left-[10%] bottom-[14%] size-24 rotate-3" },
  { className: "right-[9%] bottom-[10%] size-28 -rotate-3" },
];

export function ClosingSection({
  content,
  brand,
  alumni,
  industry,
  students,
  onPrev,
  onFinish,
}: {
  content: IntroClosingContent;
  brand: IntroBrandContent;
  alumni: IntroAlumniContent;
  industry: IntroIndustryContent;
  students: IntroStudentsContent;
  onPrev: () => void;
  onFinish: () => void;
}) {
  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-6 py-20 text-center sm:px-10">
      <BrandBackdrop tone="sunrise" strong />

      {/* Faded echoes of the journey: alumni faces + a couple of industry logos */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden sm:block">
        {CORNER_ALUMNI.map((c, i) => {
          const person = alumni.stories[i % alumni.stories.length];
          if (!person) return null;
          return (
            <motion.div
              key={person.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.12 }}
              transition={{ duration: 1.2, delay: 0.3 + i * 0.15 }}
              className={`absolute overflow-hidden rounded-3xl blur-[1px] ${c.className}`}
            >
              <Image src={person.photoSrc} alt="" fill className="object-cover" style={{ objectPosition: "50% 15%" }} />
            </motion.div>
          );
        })}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.14 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="absolute left-[16%] top-[42%] h-10 w-24"
        >
          <Image src={industry.logos[0].src} alt="" fill className="object-contain" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.14 }}
          transition={{ duration: 1, delay: 0.65 }}
          className="absolute right-[15%] bottom-[38%] h-10 w-24"
        >
          <Image src={industry.logos[3]?.src ?? industry.logos[0].src} alt="" fill className="object-contain" />
        </motion.div>
      </div>

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
        className="pointer-events-none absolute left-1/2 top-1/2 size-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.55) 45%, transparent 75%)",
        }}
      />

      <StudentPhoto
        students={students}
        id="closing-1"
        className="pointer-events-none absolute bottom-0 right-0 z-0 hidden h-[75%] w-auto object-contain object-bottom opacity-85 lg:block"
      />
      <StudentPhoto
        students={students}
        id="closing-2"
        className="pointer-events-none absolute bottom-0 left-0 z-0 hidden h-[60%] w-auto object-contain object-bottom opacity-50 blur-[1px] lg:block"
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
              className="text-xl leading-relaxed text-slate-700"
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
          <button type="button" onClick={onPrev} className="text-xs font-medium text-slate-500 hover:text-slate-700">
            חזרה
          </button>
        </motion.div>
      </div>
    </div>
  );
}
