"use client";

import Link from "next/link";
import type { HomeContent } from "@/lib/content/schemas";
import type { CourseMeta, CourseTheme, CourseSlug } from "@/lib/types";
import { useAuth } from "@/lib/hooks/use-auth";
import { useOverallProgress } from "@/lib/hooks/use-overall-progress";
import { useAllCourseProgress } from "@/lib/hooks/use-all-course-progress";
import { computeNextTask } from "@/lib/next-task";
import { ContinueLearningCard } from "@/components/dashboard/ContinueLearningCard";
import { CourseCard } from "@/components/courses/CourseCard";
import { StatTile } from "@/components/shared/StatTile";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { FullScreenLoader } from "@/components/shared/FullScreenLoader";

export function DashboardScreen({
  home,
  courseMetas,
  courseThemes,
}: {
  home: HomeContent;
  courseMetas: CourseMeta[];
  courseThemes: Record<CourseSlug, CourseTheme>;
}) {
  const { user } = useAuth();
  const { progress: overall, loading: overallLoading } = useOverallProgress(user?.id);
  const { progress: courseProgresses, loading: coursesLoading } = useAllCourseProgress(user?.id);

  if (!user || overallLoading || coursesLoading || !overall || !courseProgresses) {
    return <FullScreenLoader />;
  }

  const nextTask = computeNextTask({ overall, courseMetas, courseProgresses });
  const completedCoursesCount = courseMetas.filter((c) => courseProgresses[c.slug]?.completed).length;
  const firstName = user.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">שלום {firstName} 👋</h1>
        <p className="mt-1 text-slate-500">{home.greetingSubtitle}</p>
      </div>

      <ContinueLearningCard task={nextTask} kicker={home.heroKicker} overallPercent={overall.percent} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label={home.sectionTitles.progress}
          value={`${completedCoursesCount} / ${courseMetas.length} קורסים`}
          icon="GraduationCap"
        />
        <StatTile
          label="מבחנים שעברתי בהצלחה"
          value={`${completedCoursesCount}`}
          icon="ClipboardCheck"
        />
        <StatTile
          label="מי זאת איקום"
          value={overall.aboutEcomCompleted ? "הושלם" : "טרם הושלם"}
          icon="Building2"
        />
      </div>

      <div className="flex flex-col gap-4">
        <SectionHeader
          title={home.sectionTitles.courses}
          action={
            <Link href="/courses" className="text-sm font-semibold text-[var(--brand-purple)] hover:underline">
              לכל הקורסים
            </Link>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courseMetas.map((meta) => (
            <CourseCard
              key={meta.slug}
              meta={meta}
              theme={courseThemes[meta.slug]}
              progress={courseProgresses[meta.slug]}
              compact
            />
          ))}
        </div>
      </div>
    </div>
  );
}
