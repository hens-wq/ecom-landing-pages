"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Quote } from "lucide-react";
import type { AboutEcomContent } from "@/lib/content/schemas";
import type { CourseMeta, CourseTheme, CourseSlug } from "@/lib/types";
import { DEFAULT_ICON, ICON_MAP } from "@/lib/icon-map";
import { useAuth } from "@/lib/hooks/use-auth";
import { progressRepository } from "@/lib/repositories/progress.repository";
import { Button } from "@/components/ui/button";
import { StatsGrid } from "@/components/shared/StatsGrid";
import { ValueCards } from "@/components/shared/ValueCards";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { ThemedAccentBackground } from "@/components/shared/GeometricDecor";
import { CourseThemeProvider } from "@/components/courses/CourseThemeProvider";

export function AboutEcomScreen({
  content,
  courseMetas,
  courseThemes,
}: {
  content: AboutEcomContent;
  courseMetas: CourseMeta[];
  courseThemes: Record<CourseSlug, CourseTheme>;
}) {
  const { user } = useAuth();
  const router = useRouter();

  async function handleStartTraining() {
    if (user) {
      await progressRepository.markAboutEcomComplete(user.id);
    }
    router.push("/courses");
  }

  return (
    <div className="flex flex-col gap-16 pb-16">
      {/* Hero */}
      <section className="relative -mx-4 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-6 py-14 sm:mx-0 sm:px-12 sm:py-20">
        <ThemedAccentBackground wedgeCorner="top-right" />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-purple)]/10 px-3 py-1 text-xs font-semibold text-[var(--brand-purple)]">
            {content.hero.kicker}
          </span>
          <h1 className="text-2xl font-bold leading-tight text-slate-900 sm:text-4xl">
            {content.hero.title}
          </h1>
          <p className="leading-relaxed text-slate-500 sm:text-lg">{content.hero.description}</p>
        </div>
      </section>

      {/* Who we are */}
      <section className="flex flex-col gap-4">
        <SectionHeader title={content.whoWeAre.title} />
        <div className="flex flex-col gap-3 text-slate-600">
          {content.whoWeAre.body.map((p, i) => (
            <p key={i} className="leading-relaxed">
              {p}
            </p>
          ))}
        </div>
      </section>

      {/* Key numbers */}
      <section className="flex flex-col gap-5">
        <SectionHeader title={content.keyNumbers.title} />
        <StatsGrid stats={content.keyNumbers.stats} />
      </section>

      {/* Strengths */}
      <section className="flex flex-col gap-5">
        <SectionHeader title={content.strengths.title} description={content.strengths.description} />
        <ValueCards items={content.strengths.items} />
      </section>

      {/* Courses */}
      <section className="flex flex-col gap-5">
        <SectionHeader
          title="הקורסים שאנחנו מלמדים"
          description="חמישה תחומים, חמישה עולמות תוכן - תכירו את כולם בהמשך ההכשרה."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {courseMetas.map((meta) => {
            const Icon = ICON_MAP[meta.icon] ?? DEFAULT_ICON;
            const theme = courseThemes[meta.slug];
            return (
              <CourseThemeProvider key={meta.slug} theme={theme}>
                <Link
                  href={`/courses/${meta.slug}`}
                  className="flex flex-col items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3 py-5 text-center transition-shadow hover:shadow-md"
                >
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--course-soft)] text-[var(--course-text-accent)]">
                    <Icon className="size-5" />
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{meta.title}</span>
                </Link>
              </CourseThemeProvider>
            );
          })}
        </div>
      </section>

      {/* Industry connection */}
      <section className="flex flex-col gap-4">
        <SectionHeader title={content.industryConnection.title} />
        <div className="flex flex-col gap-3 text-slate-600">
          {content.industryConnection.body.map((p, i) => (
            <p key={i} className="leading-relaxed">
              {p}
            </p>
          ))}
        </div>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {content.industryConnection.points.map((point, i) => (
            <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
              {point}
            </div>
          ))}
        </div>
      </section>

      {/* Graduate stories */}
      <section className="flex flex-col gap-5">
        <SectionHeader title={content.graduateStories.title} description={content.graduateStories.description} />
        <div className="grid gap-4 sm:grid-cols-3">
          {content.graduateStories.stories.map((story, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5">
              <Quote className="size-5 text-[var(--brand-purple)]" />
              <p className="text-sm leading-relaxed text-slate-600">{story.quote}</p>
              <div className="mt-auto flex flex-col pt-2">
                <span className="text-sm font-semibold text-slate-900">{story.name}</span>
                <span className="text-xs text-slate-400">בוגר/ת קורס {story.course}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Placement */}
      <section className="flex flex-col gap-4">
        <SectionHeader title={content.placement.title} />
        <div className="flex flex-col gap-3 text-slate-600">
          {content.placement.body.map((p, i) => (
            <p key={i} className="leading-relaxed">
              {p}
            </p>
          ))}
        </div>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {content.placement.points.map((point, i) => (
            <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
              {point}
            </div>
          ))}
        </div>
      </section>

      {/* Student support */}
      <section className="flex flex-col gap-4">
        <SectionHeader title={content.studentSupport.title} />
        <div className="flex flex-col gap-3 text-slate-600">
          {content.studentSupport.body.map((p, i) => (
            <p key={i} className="leading-relaxed">
              {p}
            </p>
          ))}
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {content.studentSupport.points.map((point, i) => (
            <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
              {point}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--brand-purple)] to-[#3b1573] px-6 py-14 text-center text-white sm:px-12">
        <ThemedAccentBackground wedgeCorner="bottom-left" className="opacity-40" />
        <div className="relative mx-auto flex max-w-lg flex-col items-center gap-4">
          <h2 className="text-2xl font-bold sm:text-3xl">{content.finalCta.title}</h2>
          <p className="leading-relaxed text-white/70">{content.finalCta.description}</p>
          <Button
            onClick={handleStartTraining}
            size="lg"
            className="mt-2 bg-white text-[var(--brand-purple)] hover:bg-white/90"
          >
            {content.finalCta.buttonLabel}
            <ArrowLeft className="size-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
