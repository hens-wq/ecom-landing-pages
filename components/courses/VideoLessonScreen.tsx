"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, FileText, Play, Clock3 } from "lucide-react";
import type { Course } from "@/lib/types";
import { useAuth } from "@/lib/hooks/use-auth";
import { useCourseProgress } from "@/lib/hooks/use-course-progress";
import { CourseThemeProvider } from "@/components/courses/CourseThemeProvider";
import { Breadcrumbs } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { FullScreenLoader } from "@/components/shared/FullScreenLoader";
import { ThemedAccentBackground } from "@/components/shared/GeometricDecor";

const PLACEHOLDER_HOST = "example.com";

export function VideoLessonScreen({ course }: { course: Course }) {
  const { user } = useAuth();
  const { progress, loading, markVideoWatched } = useCourseProgress(user?.id, course.meta.slug);
  const router = useRouter();
  const [showTranscript, setShowTranscript] = useState(false);

  if (!user || loading || !progress) {
    return <FullScreenLoader />;
  }

  const video = course.video;
  const isPlaceholder = video.url.includes(PLACEHOLDER_HOST);

  async function handleContinue() {
    await markVideoWatched();
    router.push(`/courses/${course.meta.slug}/quiz`);
  }

  return (
    <CourseThemeProvider theme={course.theme}>
      <div className="flex flex-col gap-6 pb-16">
        <Breadcrumbs
          items={[
            { label: "בית", href: "/" },
            { label: "הקורסים", href: "/courses" },
            { label: course.meta.title, href: `/courses/${course.meta.slug}` },
            { label: "סרטון עוז" },
          ]}
        />

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--course-text-accent)]">
              סרטון עוז - {course.meta.title}
            </span>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{video.title}</h1>
            <p className="text-slate-500">{video.description}</p>
            <div className="mt-1 flex items-center gap-4 text-sm text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock3 className="size-4" />
                {video.durationLabel}
              </span>
              <span>{video.presenter}</span>
              {progress.videoWatched && (
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <CheckCircle2 className="size-4" />
                  נצפה
                </span>
              )}
            </div>
          </div>

          <div className="relative aspect-video overflow-hidden rounded-3xl border border-slate-200 bg-slate-900">
            {isPlaceholder ? (
              <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--course-primary)] to-[var(--course-secondary)]">
                <ThemedAccentBackground wedgeCorner="bottom-left" className="opacity-40" />
                <div className="relative flex flex-col items-center gap-3 text-white">
                  <div className="flex size-16 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                    <Play className="size-7 translate-x-[-2px]" fill="currentColor" />
                  </div>
                  <p className="text-sm text-white/80">הסרטון יתווסף כאן בקרוב</p>
                </div>
              </div>
            ) : (
              <video
                src={video.url}
                controls
                className="h-full w-full"
                onEnded={() => markVideoWatched()}
              />
            )}
          </div>

          {video.transcript && (
            <div className="rounded-2xl border border-slate-200 bg-white">
              <button
                onClick={() => setShowTranscript((v) => !v)}
                className="flex w-full items-center gap-2.5 px-5 py-4 text-sm font-semibold text-slate-700"
              >
                <FileText className="size-4 text-[var(--course-text-accent)]" />
                תמלול הסרטון
                <span className="mr-auto text-xs font-normal text-slate-400">
                  {showTranscript ? "הסתר" : "הצג"}
                </span>
              </button>
              {showTranscript && (
                <div className="border-t border-slate-100 px-5 py-4 text-sm leading-relaxed text-slate-500">
                  {video.transcript}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleContinue} size="lg">
              עבור למבחן הידע
              <ArrowLeft className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </CourseThemeProvider>
  );
}
