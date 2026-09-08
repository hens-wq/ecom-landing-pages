"use client";

import {
  Lock,
  MonitorCheck,
  Network,
  Radar,
  ShieldCheck,
  Terminal,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { aiContent } from "@/content/landing/brand-ai";

const ICONS: Record<string, LucideIcon> = {
  ShieldCheck,
  Network,
  MonitorCheck,
  Radar,
  Lock,
  Terminal,
  Wrench,
};

// Scattered desktop positions (% of the visual stage), tuned so labels sit
// around the central visual without overlapping it.
const POSITIONS = [
  { top: "4%", left: "2%" },
  { top: "0%", left: "62%" },
  { top: "26%", left: "84%" },
  { top: "40%", left: "22%" },
  { top: "68%", left: "0%" },
  { top: "74%", left: "66%" },
  { top: "92%", left: "36%" },
];

/**
 * Structural clone of Cyber's CyberExperienceSection. Section background
 * is ai-dark instead of ink-950. The two ambient glows keep both teal and
 * purple (matching Cyber's original balance) but are re-weighted — teal
 * larger/brighter, purple smaller/fainter — so this section reads as
 * turquoise-led with a genuine, visible purple accent rather than an even
 * 50/50 split.
 */
export function CyberExperienceSection() {
  const { cyberExperience } = aiContent;
  const topics = cyberExperience.topics;

  return (
    <section className="relative overflow-hidden bg-ai-dark px-5 py-16 sm:px-8 md:px-16 md:py-24">
      <ImagePlaceholder
        fill
        src={cyberExperience.bgSrc}
        label="מרקם SOC רחב"
        description="חדר בקרה/SOC רחב עם מסכים ואנשי צוות — טקסטורת רקע לסקשן, לא תוכן ראשי."
        sizes="100vw"
        className="opacity-30"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ai-dark via-ai-dark/85 to-ai-dark" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-ink-800) 1px, transparent 1px), linear-gradient(90deg, var(--color-ink-800) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-32 start-1/4 size-[520px] rounded-full bg-teal-500/20 blur-[120px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 end-1/4 size-[420px] rounded-full bg-brand-600/12 blur-[110px]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-3xl text-center">
        <AnimatedSection effect="fade-up">
          <p className="text-eyebrow text-teal-300 uppercase">{cyberExperience.eyebrow}</p>
          <h2 className="text-display-lg mt-3 text-balance text-off-white">
            {cyberExperience.headline}
          </h2>
          <p className="mt-4 text-lg text-ink-200">{cyberExperience.body}</p>
        </AnimatedSection>
      </div>

      {/* Desktop: scattered interface labels around a central visual */}
      <div className="relative mx-auto mt-16 hidden max-w-5xl md:block">
        <div className="relative min-h-[560px]">
          <svg className="absolute inset-0 h-full w-full opacity-40" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            {POSITIONS.map((pos, i) => (
              <line
                key={i}
                x1={pos.left}
                y1={pos.top}
                x2="50%"
                y2="50%"
                stroke="var(--color-teal-500)"
                strokeWidth="0.15"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          <div className="absolute inset-0 m-auto h-[300px] w-[420px]">
            <AnimatedSection effect="scale-in" delay={0.1} className="h-full w-full">
              <ImagePlaceholder
                aspectRatio="16/9"
                src={cyberExperience.visual.src}
                label={cyberExperience.visual.label}
                description={cyberExperience.visual.description}
                imagePosition="object-[68%_28%]"
                sizes="420px"
                className="h-full w-full border-white/10"
              />
            </AnimatedSection>
          </div>

          {topics.map((topic, index) => {
            const Icon = ICONS[topic.icon];
            const pos = POSITIONS[index];
            return (
              <AnimatedSection
                key={topic.label}
                effect="fade-in"
                delay={0.15 + index * 0.06}
                className="absolute"
                style={{ top: pos.top, left: pos.left }}
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-ai-dark/80 px-3.5 py-2 text-sm text-ink-100 backdrop-blur-sm">
                  <Icon className="size-4 text-teal-400" aria-hidden />
                  {topic.label}
                </span>
              </AnimatedSection>
            );
          })}
        </div>
      </div>

      {/* Mobile: visual + horizontal snap-scroll chip strip */}
      <div className="relative mt-10 md:hidden">
        <ImagePlaceholder
          aspectRatio="4/3"
          src={cyberExperience.visual.src}
          label={cyberExperience.visual.label}
          description={cyberExperience.visual.description}
          imagePosition="object-[64%_30%]"
          sizes="100vw"
          className="w-full border-white/10"
        />
        <div className="no-scrollbar mt-6 flex snap-x gap-2.5 overflow-x-auto pb-2">
          {topics.map((topic) => {
            const Icon = ICONS[topic.icon];
            return (
              <span
                key={topic.label}
                className="inline-flex shrink-0 snap-start items-center gap-2 rounded-full border border-white/10 bg-ai-dark/80 px-3.5 py-2 text-sm whitespace-nowrap text-ink-100"
              >
                <Icon className="size-4 text-teal-400" aria-hidden />
                {topic.label}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
