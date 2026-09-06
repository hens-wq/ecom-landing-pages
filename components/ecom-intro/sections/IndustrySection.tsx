"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { IntroBrandContent, IntroIndustryContent } from "@/lib/content/schemas";
import { SectionNav } from "@/components/ecom-intro/SectionNav";
import { BrandBackdrop } from "@/components/ecom-intro/BrandBackdrop";
import { HighlightEcom } from "@/components/ecom-intro/HighlightEcom";
import { DotGrid, FilledTriangle, OutlineTriangle } from "@/components/shared/GeometricDecor";

/**
 * Fixed per-company placement matching the approved reference image
 * one-to-one (kept as an explicit map, not a generic ellipse formula,
 * because the approved layout groups logos in uneven rows - 4 across the
 * top, 2-2 on the upper/lower sides, 3 across the bottom - rather than
 * spacing them evenly around a perfect ellipse). Values are percentages of
 * the orbit container. If a future content edit adds a company not listed
 * here, it is skipped rather than guessed at - see the fallback note below.
 */
const LOGO_LAYOUT: Record<string, { left: string; top: string; width: number }> = {
  Microsoft: { left: "21%", top: "29%", width: 168 },
  "Check Point": { left: "41.5%", top: "29%", width: 168 },
  Deloitte: { left: "60%", top: "29%", width: 150 },
  Manpower: { left: "79%", top: "29%", width: 150 },
  EY: { left: "24.5%", top: "45%", width: 108 },
  Ness: { left: "74%", top: "45.5%", width: 108 },
  Citadel: { left: "19.5%", top: "58%", width: 150 },
  Partner: { left: "82.5%", top: "58%", width: 150 },
  Radware: { left: "32%", top: "68%", width: 150 },
  Wix: { left: "50%", top: "70%", width: 130 },
  Bynet: { left: "68%", top: "68%", width: 168 },
};

function OrbitLogos({ logos, markSrc }: { logos: IntroIndustryContent["logos"]; markSrc: string }) {
  const placed = logos.filter((logo) => LOGO_LAYOUT[logo.name]);

  return (
    <div className="relative mx-auto aspect-[16/9] w-full max-w-6xl">
      {/* Dashed orbit path + small connector dots, one per logo */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <ellipse
          cx="50"
          cy="49"
          rx="44"
          ry="34"
          fill="none"
          stroke="var(--brand-purple)"
          strokeWidth="0.25"
          strokeDasharray="1.4 2.6"
          opacity="0.35"
        />
        {placed.map((logo) => {
          const pos = LOGO_LAYOUT[logo.name];
          return (
            <circle
              key={logo.name}
              cx={parseFloat(pos.left)}
              cy={parseFloat(pos.top)}
              r="0.5"
              fill="var(--brand-purple)"
              opacity="0.4"
            />
          );
        })}
      </svg>

      {/* Soft purple glow behind the center mark */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 blur-3xl sm:size-80"
        style={{ background: "radial-gradient(circle, rgba(140,82,255,0.35) 0%, rgba(140,82,255,0) 70%)" }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="absolute left-1/2 top-1/2 z-10 mix-blend-multiply -translate-x-1/2 -translate-y-1/2"
      >
        <Image
          src={markSrc}
          alt="Ecom"
          width={160}
          height={160}
          className="h-20 w-20 object-contain sm:h-28 sm:w-28"
        />
      </motion.div>

      {placed.map((logo, i) => {
        const pos = LOGO_LAYOUT[logo.name];
        return (
          <motion.div
            key={logo.name}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.04 }}
            whileHover={{ scale: 1.08 }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: pos.left, top: pos.top, width: pos.width }}
          >
            <div className="flex h-16 items-center justify-center rounded-2xl border border-slate-100 bg-white px-4 py-2.5 shadow-[0_10px_25px_-10px_rgba(15,23,42,0.25)]">
              <div className="relative h-full w-full">
                <Image src={logo.src} alt={logo.name} fill sizes="180px" className="object-contain" />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/**
 * Bottom-left "office culture" card from the approved reference. No real
 * office/team photo exists in the project yet, so this keeps the exact
 * shape, size, position and text overlay ready, with a brand-toned
 * placeholder background instead of a fabricated photo - swapping in
 * officePhotoSrc (content/site/ecom-intro/industry.json) is a content-only
 * change once the real asset is provided.
 */
function OfficeCultureCard({ photoSrc }: { photoSrc?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="pointer-events-none absolute -left-6 bottom-0 z-20 hidden sm:-left-10 sm:block"
    >
      <div className="relative">
        <OutlineTriangle
          className="-left-10 -top-12 text-[var(--brand-teal)] opacity-70"
          size={260}
          rotate={-8}
        />
        <div
          className="relative h-56 w-64 overflow-hidden bg-gradient-to-br from-[#0f0b2e] via-[var(--brand-purple)]/70 to-[var(--brand-teal)]/60 shadow-[0_25px_60px_-20px_rgba(15,23,42,0.45)] sm:h-64 sm:w-72"
          style={{
            borderRadius: "1.75rem",
            clipPath: "polygon(0% 0%, 80% 0%, 100% 20%, 100% 100%, 0% 100%)",
          }}
        >
          {photoSrc && <Image src={photoSrc} alt="" fill sizes="288px" className="object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <p className="absolute bottom-5 right-5 max-w-[85%] text-lg font-extrabold leading-tight text-white sm:text-xl">
            Great People Build{" "}
            <span className="text-[#c9adff]">Amazing Things</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function IndustrySection({
  content,
  brand,
  onNext,
  onPrev,
}: {
  content: IntroIndustryContent;
  brand: IntroBrandContent;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-hidden px-6 py-16 sm:px-10">
      <BrandBackdrop tone="violet" />

      {/* Top-right geometric shape */}
      <OutlineTriangle
        className="-right-16 -top-14 text-[var(--brand-purple)] opacity-[0.45]"
        size={220}
        rotate={10}
      />

      {/* Bottom-right dot-grid + small triangle accents */}
      <DotGrid className="right-8 bottom-16 h-20 w-20 text-slate-400 opacity-[0.22]" />
      <FilledTriangle className="bottom-[7%] right-[4%] text-[var(--brand-purple)] opacity-50" size={18} rotate={90} />
      <OutlineTriangle className="bottom-[16%] right-[9%] text-[var(--brand-teal)] opacity-40" size={20} rotate={-10} />

      <div className="relative z-10 mx-auto flex w-full max-w-[90rem] flex-1 flex-col items-center justify-center gap-8">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3 text-[11px] font-bold tracking-[0.3em] text-[var(--brand-purple)]"
          >
            <span className="h-px w-10 bg-[var(--brand-purple)]/30" />
            STRONGER TOGETHER
            <span className="h-px w-10 bg-[var(--brand-purple)]/30" />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-5xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-6xl"
          >
            <HighlightEcom text={content.headline} />
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

        {/* Desktop: logos orbiting the Ecom mark + office culture card, matching the approved reference */}
        <div className="relative hidden w-full lg:block">
          <OrbitLogos logos={content.logos} markSrc={brand.logoMarkSrc} />
          <OfficeCultureCard photoSrc={content.officePhotoSrc} />
        </div>

        {/* Mobile/tablet: simple organic wrap so nothing overlaps at narrow widths */}
        <div className="flex w-full flex-wrap items-center justify-center gap-x-10 gap-y-8 px-4 lg:hidden">
          {content.logos.map((logo, i) => (
            <motion.div
              key={logo.name}
              initial={{ opacity: 0, y: 16, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.05 }}
              className="relative h-12 w-32 shrink-0 sm:h-14 sm:w-36"
            >
              <Image
                src={logo.src}
                alt={logo.name}
                fill
                sizes="180px"
                className="object-contain drop-shadow-[0_4px_10px_rgba(15,23,42,0.08)]"
              />
            </motion.div>
          ))}
        </div>

        {content.logosCaption && (
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-sm font-semibold text-slate-500"
          >
            {content.logosCaption}
          </motion.p>
        )}

        <SectionNav onPrev={onPrev} onNext={onNext} />
      </div>
    </div>
  );
}
