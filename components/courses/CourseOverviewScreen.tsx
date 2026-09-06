"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Course } from "@/lib/types";
import { useAuth } from "@/lib/hooks/use-auth";
import { useCourseProgress } from "@/lib/hooks/use-course-progress";
import { computeCourseJourney } from "@/lib/course-journey";
import { CourseThemeProvider } from "@/components/courses/CourseThemeProvider";
import { CourseHero } from "@/components/courses/CourseHero";
import { CourseJourney } from "@/components/courses/CourseJourney";
import { Breadcrumbs } from "@/components/shared/PageHeader";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { FullScreenLoader } from "@/components/shared/FullScreenLoader";
import { Button } from "@/components/ui/button";

export function CourseOverviewScreen({ course }: { course: Course }) {
  const { user } = useAuth();
  const { progress, loading } = useCourseProgress(user?.id, course.meta.slug);

  if (!user || loading || !progress) {
    return <FullScreenLoader />;
  }

  const journey = computeCourseJourney(course, progress);
  const currentItem = journey.find((item) => item.status === "current");

  return (
    <CourseThemeProvider theme={course.theme}>
      <div className="flex flex-col gap-8 pb-10">
        <Breadcrumbs
          items={[
            { label: "בית", href: "/" },
            { label: "הקורסים", href: "/courses" },
            { label: course.meta.title },
          ]}
        />
        <CourseHero meta={course.meta} overview={course.overview} percent={progress.percent} />

        <div className="flex flex-col gap-5">
          <SectionHeader
            kicker="מסע הלמידה בקורס"
            title="מה למדנו ומה נשאר"
            description="חומרי למידה בשלושה נושאים, סרטון של עוז ומבחן ידע קצר בסוף."
            action={
              currentItem && (
                <Button asChild>
                  <Link href={currentItem.href}>
                    המשך מכאן
                    <ArrowLeft className="size-4" />
                  </Link>
                </Button>
              )
            }
          />
          <div className="max-w-2xl">
            <CourseJourney items={journey} />
          </div>
        </div>
      </div>
    </CourseThemeProvider>
  );
}
