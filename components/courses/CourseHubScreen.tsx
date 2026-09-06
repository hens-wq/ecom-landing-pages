"use client";

import type { CourseMeta, CourseSlug, CourseTheme } from "@/lib/types";
import { useAuth } from "@/lib/hooks/use-auth";
import { useAllCourseProgress } from "@/lib/hooks/use-all-course-progress";
import { PageHeader } from "@/components/shared/PageHeader";
import { CourseCard } from "@/components/courses/CourseCard";
import { FullScreenLoader } from "@/components/shared/FullScreenLoader";

export function CourseHubScreen({
  courseMetas,
  courseThemes,
}: {
  courseMetas: CourseMeta[];
  courseThemes: Record<CourseSlug, CourseTheme>;
}) {
  const { user } = useAuth();
  const { progress: courseProgresses, loading } = useAllCourseProgress(user?.id);

  if (!user || loading || !courseProgresses) {
    return <FullScreenLoader />;
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      <PageHeader
        crumbs={[{ label: "בית", href: "/" }, { label: "הקורסים" }]}
        title="הקורסים"
        description="חמישה קורסים, חמישה עולמות תוכן. בכל קורס תמצאו חומרי למידה, סרטון של עוז ומבחן ידע קצר."
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {courseMetas.map((meta) => (
          <CourseCard key={meta.slug} meta={meta} theme={courseThemes[meta.slug]} progress={courseProgresses[meta.slug]} />
        ))}
      </div>
    </div>
  );
}
