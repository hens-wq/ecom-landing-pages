import type { Metadata } from "next";
import { getCourseOrNotFound } from "@/lib/get-course-or-404";
import { CourseOverviewScreen } from "@/components/courses/CourseOverviewScreen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = getCourseOrNotFound(slug);
  return { title: `${course.meta.title} | אקדמיית איקום` };
}

export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = getCourseOrNotFound(slug);
  return <CourseOverviewScreen course={course} />;
}
