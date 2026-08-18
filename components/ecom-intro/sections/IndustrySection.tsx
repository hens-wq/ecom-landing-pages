"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { IntroIndustryContent, IntroStudentsContent } from "@/lib/content/schemas";
import { SectionNav } from "@/components/ecom-intro/SectionNav";
import { BrandBackdrop } from "@/components/ecom-intro/BrandBackdrop";
import { StudentPhoto } from "@/components/ecom-intro/StudentPhoto";

function LogoRow({ logos, reverse, durationS }: { logos: IntroIndustryContent["logos"]; reverse?: boolean; durationS: number }) {
  const track = [...logos, ...logos];
  return (
    <div
      className="flex w-max items-center gap-4"
      style={{ animation: `ecom-marquee ${durationS}s linear infinite${reverse ? " reverse" : ""}` }}
    >
      {track.map((logo, i) => (
        <div
          key={`${logo.name}-${i}`}
          className="flex h-16 w-32 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white/90 px-4 sm:h-20 sm:w-40"
        >
          <div className="relative h-8 w-full sm:h-10">
            <Image src={logo.src} alt={logo.name} fill sizes="160px" className="object-contain" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function IndustrySection({
  content,
  students,
  onNext,
  onPrev,
}: {
  content: IntroIndustryContent;
  students: IntroStudentsContent;
  onNext: () => void;
  onPrev: () => void;
}) {
  const mid = Math.ceil(content.logos.length / 2);
  const rowA = content.logos.slice(0, mid);
  const rowB = content.logos.slice(mid);

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-6 py-16 sm:px-10">
      <BrandBackdrop tone="violet" />
      <StudentPhoto
        students={students}
        id="industry-1"
        className="pointer-events-none absolute bottom-0 left-4 z-0 hidden h-[62%] w-auto object-contain object-bottom opacity-85 lg:block"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-[90rem] flex-1 flex-col items-center justify-center gap-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-2xl font-extrabold text-[var(--brand-purple)] sm:text-3xl"
          >
            {content.alternativeHeadline}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.05 }}
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
            {content.body}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative flex w-full flex-col gap-4 overflow-hidden rounded-[2rem] border border-slate-200 bg-white/60 py-8 shadow-[0_30px_80px_-40px_rgba(140,82,255,0.3)] backdrop-blur-sm"
          style={{
            maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
            WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
          }}
        >
          <LogoRow logos={rowA} durationS={30} />
          <LogoRow logos={rowB} reverse durationS={34} />
        </motion.div>

        <SectionNav onPrev={onPrev} onNext={onNext} />
      </div>
    </div>
  );
}
