import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, Video } from "lucide-react";
import type { CourseMeta, CourseProgress, CourseTheme } from "@/lib/types";
import { DEFAULT_ICON, ICON_MAP } from "@/lib/icon-map";
import { CourseThemeProvider } from "@/components/courses/CourseThemeProvider";
import { Progress } from "@/components/ui/progress";
import { ThemedAccentBackground } from "@/components/shared/GeometricDecor";
import { cn } from "@/lib/utils";

export function CourseCard({
  meta,
  theme,
  progress,
  compact = false,
}: {
  meta: CourseMeta;
  theme: CourseTheme;
  progress?: CourseProgress;
  compact?: boolean;
}) {
  const Icon = ICON_MAP[meta.icon] ?? DEFAULT_ICON;
  const percent = progress?.percent ?? 0;
  const videoDone = progress?.videoWatched ?? false;
  const quizDone = progress?.quizPassed ?? false;

  return (
    <CourseThemeProvider theme={theme}>
      <Link
        href={`/courses/${meta.slug}`}
        className="group relative block overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
        style={{ boxShadow: percent > 0 ? `0 1px 2px rgba(15,23,42,0.04)` : undefined }}
      >
        <ThemedAccentBackground wedgeCorner="top-left" className="opacity-80" />
        <div className={cn("relative flex flex-col gap-4", compact ? "p-4" : "p-5")}>
          <div className="flex items-start justify-between">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--course-soft)] text-[var(--course-text-accent)]">
              <Icon className="size-5" />
            </div>
            {progress?.completed && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
                <CheckCircle2 className="size-3.5" />
                הושלם
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <h3 className="font-bold text-slate-900">{meta.displayName}</h3>
            <p className="text-xs text-slate-400">{meta.subtitle}</p>
            {!compact && <p className="mt-1 text-sm leading-relaxed text-slate-500">{meta.shortDescription}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>התקדמות</span>
              <span className="font-semibold text-slate-700">{percent}%</span>
            </div>
            <Progress value={percent} className="h-1.5 bg-slate-100" />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                {videoDone ? (
                  <CheckCircle2 className="size-3.5 text-[var(--course-primary)]" />
                ) : (
                  <Video className="size-3.5" />
                )}
                סרטון עוז
              </span>
              <span className="flex items-center gap-1">
                {quizDone ? (
                  <CheckCircle2 className="size-3.5 text-[var(--course-primary)]" />
                ) : (
                  <Circle className="size-3.5" />
                )}
                מבחן ידע
              </span>
            </div>
            <span className="flex items-center gap-1 text-xs font-semibold text-[var(--course-text-accent)] transition-transform group-hover:-translate-x-0.5">
              כניסה לקורס
              <ArrowLeft className="size-3.5" />
            </span>
          </div>
        </div>
      </Link>
    </CourseThemeProvider>
  );
}
