"use client";

import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import type { Course, CourseMeta } from "@/lib/types";
import { useAuth } from "@/lib/hooks/use-auth";
import { useCourseProgress } from "@/lib/hooks/use-course-progress";
import { useAllCourseProgress } from "@/lib/hooks/use-all-course-progress";
import { CourseThemeProvider } from "@/components/courses/CourseThemeProvider";
import { Breadcrumbs } from "@/components/shared/PageHeader";
import { CompletionState } from "@/components/shared/CompletionState";
import { Button } from "@/components/ui/button";
import { FullScreenLoader } from "@/components/shared/FullScreenLoader";

export function CourseCompleteScreen({
  course,
  allCourseMetas,
}: {
  course: Course;
  allCourseMetas: CourseMeta[];
}) {
  const { user } = useAuth();
  const { progress, loading } = useCourseProgress(user?.id, course.meta.slug);
  const { progress: allProgress, loading: allLoading } = useAllCourseProgress(user?.id);

  if (!user || loading || allLoading || !progress || !allProgress) {
    return <FullScreenLoader />;
  }

  const nextCourse = allCourseMetas.find(
    (c) => c.slug !== course.meta.slug && !allProgress[c.slug]?.completed
  );

  return (
    <CourseThemeProvider theme={course.theme}>
      <div className="flex flex-col gap-6 pb-16">
        <Breadcrumbs
          items={[
            { label: "בית", href: "/" },
            { label: "הקורסים", href: "/courses" },
            { label: course.meta.title, href: `/courses/${course.meta.slug}` },
            { label: "סיכום" },
          ]}
        />

        <div className="mx-auto w-full max-w-2xl">
          <CompletionState
            title={`סיימת את קורס ${course.meta.title}!`}
            description="עברתם על כל חומר הרקע המקצועי, צפיתם בסרטון של עוז ועברתם את מבחן הידע. עכשיו אתם מכירים את הקורס הזה טוב מספיק כדי למכור אותו נכון."
            stats={[
              { label: "נושאי חומרי הלמידה", value: `${progress.topicsCompleted.length}/3` },
              { label: "ציון מבחן", value: `${progress.bestScore}%` },
              { label: "ניסיונות", value: `${progress.attempts.length}` },
            ]}
            action={
              <div className="flex flex-wrap justify-center gap-3">
                {nextCourse ? (
                  <Button asChild size="lg">
                    <Link href={`/courses/${nextCourse.slug}`}>
                      המשך לקורס {nextCourse.title}
                      <ArrowLeft className="size-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="lg">
                    <Link href="/sales-method">
                      להמשיך לשיטת המכירה של Ecom
                      <ArrowLeft className="size-4" />
                    </Link>
                  </Button>
                )}
                <Button asChild variant="outline" size="lg">
                  <Link href="/courses">לכל הקורסים</Link>
                </Button>
                <Button asChild variant="ghost" size="lg">
                  <Link href="/">
                    <Home className="size-4" />
                    חזרה לדף הראשי
                  </Link>
                </Button>
              </div>
            }
          />
        </div>
      </div>
    </CourseThemeProvider>
  );
}
