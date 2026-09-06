import type { Metadata } from "next";
import { getCourseOrNotFound } from "@/lib/get-course-or-404";
import { getAllCourseMetas } from "@/lib/content/loader";
import { CourseCompleteScreen } from "@/components/courses/CourseCompleteScreen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = getCourseOrNotFound(slug);
  return { title: `סיכום - ${course.meta.title} | מכללת Ecom` };
}

export default async function CourseCompletePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = getCourseOrNotFound(slug);
  const allCourseMetas = getAllCourseMetas();
  return <CourseCompleteScreen course={course} allCourseMetas={allCourseMetas} />;
}
