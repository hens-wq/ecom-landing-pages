"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Quote, Sparkles } from "lucide-react";
import type { SalesMethodContent } from "@/lib/content/schemas";
import { useAuth } from "@/lib/hooks/use-auth";
import { progressRepository } from "@/lib/repositories/progress.repository";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { ThemedAccentBackground } from "@/components/shared/GeometricDecor";
import { PageHeader } from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";

function PrincipleCards({ principles }: { principles: SalesMethodContent["mindset"]["principles"] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {principles.map((p) => (
        <div key={p.number} className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-5">
          <span className="text-2xl font-extrabold text-[var(--brand-purple)]/30">{p.number}</span>
          <h3 className="font-semibold text-slate-900">{p.title}</h3>
          <p className="text-sm leading-relaxed text-slate-500">{p.description}</p>
        </div>
      ))}
    </div>
  );
}

function TagList({ items, tone = "slate" }: { items: string[]; tone?: "slate" | "amber" | "emerald" }) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-50 text-slate-600";
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span key={i} className={cn("rounded-full border px-3 py-1.5 text-xs font-medium", toneClass)}>
          {item}
        </span>
      ))}
    </div>
  );
}

function TracksOverviewTable({ tracksOverview }: { tracksOverview: SalesMethodContent["tracksOverview"] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">מסלול</th>
              <th className="px-4 py-3">למי מתאים</th>
              <th className="px-4 py-3">שכר כניסה</th>
              <th className="px-4 py-3">אחרי ניסיון</th>
              <th className="px-4 py-3">מתקדם</th>
            </tr>
          </thead>
          <tbody>
            {tracksOverview.tracks.map((t) => (
              <tr key={t.id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-3 font-semibold text-slate-900">{t.name}</td>
                <td className="px-4 py-3 text-slate-500">{t.suits}</td>
                <td className="px-4 py-3 text-slate-600">{t.salary.entry}</td>
                <td className="px-4 py-3 text-slate-600">{t.salary.afterExperience}</td>
                <td className="px-4 py-3 text-slate-600">{t.salary.advanced}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">{tracksOverview.salaryNote}</p>
    </div>
  );
}

function TrackDetailCards({ trackDetails }: { trackDetails: SalesMethodContent["trackDetails"] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {trackDetails.tracks.map((t) => (
        <div key={t.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-purple)]">
              {t.name} · קורס {t.courseNumber} מתוך {t.totalCourses}
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-900">{t.headline}</h3>
          <div className="flex flex-wrap gap-1.5 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-2.5 py-1">כניסה {t.salary.entry}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1">אחרי ניסיון {t.salary.afterExperience}</span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1">מתקדם {t.salary.advanced}</span>
          </div>
          <p className="text-sm leading-relaxed text-slate-600">{t.whatItIs}</p>
          <p className="text-sm leading-relaxed text-slate-500">
            <span className="font-semibold text-slate-700">למי זה מתאים: </span>
            {t.whoItSuits}
          </p>
          {t.rolesAfter && (
            <p className="text-xs text-slate-400">
              <span className="font-semibold text-slate-500">תפקידים לאחר ההכשרה: </span>
              {t.rolesAfter}
            </p>
          )}
          {t.pendingNote && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-700">{t.pendingNote}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function MatchingToolDiagram({ matchingTool }: { matchingTool: SalesMethodContent["matchingTool"] }) {
  const columnLabel = (c: "dynamic" | "technical") =>
    c === "dynamic" ? matchingTool.axisXLabels.dynamic : matchingTool.axisXLabels.technical;
  const rowLabel = (r: "hasEnglish" | "noEnglish") =>
    r === "hasEnglish" ? matchingTool.axisYLabels.hasEnglish : matchingTool.axisYLabels.noEnglish;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <p className="text-xs font-medium text-slate-400">
        ציר אופקי: {matchingTool.axisXLabels.dynamic} ↔ {matchingTool.axisXLabels.technical} · ציר אנכי:{" "}
        {matchingTool.axisYLabels.hasEnglish} ↔ {matchingTool.axisYLabels.noEnglish}
      </p>
      <div className="relative grid grid-cols-2 gap-3">
        {matchingTool.quadrants.map((q) => (
          <div
            key={q.id}
            className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-6 text-center"
          >
            <span className="text-lg font-bold text-slate-900">{q.trackName}</span>
            <span className="text-[11px] font-medium text-slate-400">
              {columnLabel(q.column)} · {rowLabel(q.row)}
            </span>
          </div>
        ))}
        <div className="pointer-events-none absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[var(--brand-purple)] bg-white shadow-lg">
          <span className="text-sm font-extrabold text-[var(--brand-purple)]">{matchingTool.centerLabel}</span>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-slate-400">{matchingTool.centerNote}</p>
    </div>
  );
}

function CallStructureTimeline({ callStructure }: { callStructure: SalesMethodContent["callStructure"] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {callStructure.steps.map((s) => (
          <div key={s.number} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-purple)]/10 text-xs font-bold text-[var(--brand-purple)]">
              {s.number}
            </span>
            <span className="text-sm font-medium text-slate-700">{s.title}</span>
          </div>
        ))}
      </div>
      <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-700">
        {callStructure.sideNote}
      </p>
    </div>
  );
}

export function SalesMethodScreen({ content }: { content: SalesMethodContent }) {
  const { user } = useAuth();
  const router = useRouter();
  const [finishing, setFinishing] = useState(false);

  async function handleFinish() {
    setFinishing(true);
    if (user) {
      await progressRepository.markSalesMethodComplete(user.id);
    }
    router.push("/");
  }

  return (
    <div className="flex flex-col gap-8 pb-16">
      <PageHeader crumbs={[{ label: "בית", href: "/" }, { label: "שיטת המכירה של Ecom" }]} title="שיטת המכירה של Ecom" />

      <div className="flex flex-col gap-16">
        {/* Hero */}
        <section className="relative -mx-4 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-6 py-14 sm:mx-0 sm:px-12 sm:py-20">
          <ThemedAccentBackground wedgeCorner="top-right" />
          <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-purple)]/10 px-3 py-1 text-xs font-semibold text-[var(--brand-purple)]">
              {content.hero.kicker}
            </span>
            <h1 className="text-2xl font-bold leading-tight text-slate-900 sm:text-4xl">{content.hero.title}</h1>
            <p className="leading-relaxed text-slate-500 sm:text-lg">{content.hero.description}</p>
          </div>
        </section>

        {/* Part A: Mindset */}
        <section className="flex flex-col gap-5">
          <SectionHeader kicker="חלק א׳ · המוצר והלקוח" title={content.mindset.title} description={content.mindset.description} />
          <PrincipleCards principles={content.mindset.principles} />
        </section>

        {/* Customer */}
        <section className="flex flex-col gap-5">
          <SectionHeader title={content.customer.title} description={content.customer.description} />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-slate-900">מה מניע אותם</h3>
              <TagList items={content.customer.motivations} tone="emerald" />
            </div>
            <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-slate-900">ממה הם חוששים</h3>
              <TagList items={content.customer.concerns} tone="amber" />
            </div>
            <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-slate-900">פרופילים נפוצים</h3>
              <TagList items={content.customer.profiles} />
            </div>
          </div>
          <p className="rounded-xl bg-[var(--brand-purple)]/5 px-4 py-3 text-sm font-medium leading-relaxed text-[var(--brand-purple)]">
            {content.customer.closingLine}
          </p>
        </section>

        {/* Tracks overview */}
        <section className="flex flex-col gap-5">
          <SectionHeader title={content.tracksOverview.title} description={content.tracksOverview.description} />
          <TracksOverviewTable tracksOverview={content.tracksOverview} />
        </section>

        {/* Track details */}
        <section className="flex flex-col gap-5">
          <SectionHeader title={content.trackDetails.title} description={content.trackDetails.description} />
          <TrackDetailCards trackDetails={content.trackDetails} />
        </section>

        {/* Matching tool */}
        <section className="flex flex-col gap-5">
          <SectionHeader title={content.matchingTool.title} description={content.matchingTool.description} />
          <MatchingToolDiagram matchingTool={content.matchingTool} />
        </section>

        {/* Part B: The sales call */}
        <section className="flex flex-col gap-5">
          <SectionHeader kicker="חלק ב׳ · שיחת המכירה" title={content.callStructure.title} description={content.callStructure.description} />
          <CallStructureTimeline callStructure={content.callStructure} />
        </section>

        {/* Rapport */}
        <section className="flex flex-col gap-5">
          <SectionHeader title={content.rapport.title} />
          <div className="grid gap-4 sm:grid-cols-3">
            {content.rapport.items.map((item) => (
              <div key={item.label} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="font-semibold text-slate-900">{item.label}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Energy matching */}
        <section className="flex flex-col gap-4">
          <SectionHeader title={content.energyMatching.title} description={content.energyMatching.description} />
          <TagList items={content.energyMatching.dimensions} />
        </section>

        {/* Authority + warmth */}
        <section className="flex flex-col gap-5">
          <SectionHeader title={content.authorityWarmth.title} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-[var(--brand-teal)]">{content.authorityWarmth.warmthLabel}</h3>
              {content.authorityWarmth.warmthExamples.map((ex, i) => (
                <p key={i} className="flex gap-2 text-sm leading-relaxed text-slate-600">
                  <Quote className="size-4 shrink-0 text-slate-300" />
                  {ex}
                </p>
              ))}
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-[var(--brand-purple)]">{content.authorityWarmth.authorityLabel}</h3>
              {content.authorityWarmth.authorityExamples.map((ex, i) => (
                <p key={i} className="flex gap-2 text-sm leading-relaxed text-slate-600">
                  <Quote className="size-4 shrink-0 text-slate-300" />
                  {ex}
                </p>
              ))}
            </div>
          </div>
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
            {content.authorityWarmth.insight}
          </p>
        </section>

        {/* Diagnostic exercise */}
        <section className="flex flex-col gap-4">
          <SectionHeader title={content.diagnosticExercise.title} />
          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--brand-purple)]/20 bg-[var(--brand-purple)]/5 p-5">
            <p className="text-sm font-semibold text-slate-800">{content.diagnosticExercise.exercise}</p>
            <ul className="flex flex-col gap-1.5">
              {content.diagnosticExercise.sampleQuestions.map((q, i) => (
                <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-slate-600">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--brand-purple)]" />
                  {q}
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500">{content.diagnosticExercise.toolConnection}</p>
          </div>
        </section>

        {/* Mentality & objections */}
        <section className="flex flex-col gap-5">
          <SectionHeader kicker="מנטליות, התנגדויות וסגירה" title={content.mentality.title} description={content.mentality.description} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {content.mentality.items.map((item) => (
              <div key={item.number} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4">
                <span className="text-lg font-extrabold text-[var(--brand-purple)]/30">{item.number}</span>
                <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                <p className="text-xs leading-relaxed text-slate-500">{item.description}</p>
              </div>
            ))}
          </div>
          <p className="flex gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
            <Quote className="size-4 shrink-0 text-slate-300" />
            {content.mentality.personalStory}
          </p>
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-700">
            {content.mentality.objectionsNote}
          </p>
        </section>

        {/* Summary */}
        <section className="flex flex-col gap-5">
          <SectionHeader title={content.summary.title} description={content.summary.description} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {content.summary.phases.map((phase) => (
              <div key={phase.number} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4">
                <span className="flex size-7 items-center justify-center rounded-full bg-[var(--brand-purple)]/10 text-xs font-bold text-[var(--brand-purple)]">
                  {phase.number}
                </span>
                <h3 className="text-sm font-semibold text-slate-900">{phase.title}</h3>
                <p className="text-xs leading-relaxed text-slate-500">{phase.description}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5 rounded-2xl border border-[var(--brand-teal)]/25 bg-[var(--brand-teal)]/5 px-5 py-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Sparkles className="size-4 text-[var(--brand-teal)]" />
              {content.summary.throughoutTitle}
            </h3>
            <p className="text-sm leading-relaxed text-slate-600">{content.summary.throughoutDescription}</p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--brand-purple)] to-[#3b1573] px-6 py-14 text-center text-white sm:px-12">
          <ThemedAccentBackground wedgeCorner="bottom-left" className="opacity-40" />
          <div className="relative mx-auto flex max-w-lg flex-col items-center gap-4">
            <h2 className="text-2xl font-bold sm:text-3xl">{content.finalCta.title}</h2>
            <p className="leading-relaxed text-white/70">{content.finalCta.description}</p>
            <Button
              onClick={handleFinish}
              disabled={finishing}
              size="lg"
              className="mt-2 bg-white text-[var(--brand-purple)] hover:bg-white/90"
            >
              {content.finalCta.buttonLabel}
              <ArrowLeft className="size-4" />
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
