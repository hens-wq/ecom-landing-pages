import type { CourseMeta, CourseOverview } from "@/lib/types";
import { DEFAULT_ICON, ICON_MAP } from "@/lib/icon-map";
import { ProgressRing } from "@/components/shared/ProgressRing";
import { ThemedAccentBackground } from "@/components/shared/GeometricDecor";

export function CourseHero({
  meta,
  overview,
  percent,
}: {
  meta: CourseMeta;
  overview: CourseOverview;
  percent: number;
}) {
  const Icon = ICON_MAP[meta.icon] ?? DEFAULT_ICON;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[var(--course-border)] bg-white px-6 py-10 sm:px-10 sm:py-12">
      <ThemedAccentBackground wedgeCorner="top-right" />
      <div className="relative flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--course-soft)] text-[var(--course-text-accent)]">
              <Icon className="size-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--course-text-accent)]">
                {meta.title}
              </span>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{overview.heroTitle}</h1>
            </div>
          </div>
          <p className="max-w-2xl leading-relaxed text-slate-500">{overview.heroDescription}</p>

          <div className="flex flex-wrap gap-2">
            {overview.highlights.map((h) => (
              <span
                key={h}
                className="rounded-full border border-[var(--course-border)] bg-[var(--course-soft)] px-3 py-1.5 text-xs font-medium text-[var(--course-text-accent)]"
              >
                {h}
              </span>
            ))}
          </div>
        </div>

        <div className="shrink-0 self-center">
          <ProgressRing percent={percent} label="מהקורס" />
        </div>
      </div>
    </div>
  );
}
