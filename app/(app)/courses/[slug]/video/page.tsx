import type { Metadata } from "next";
import { getCourseOrNotFound } from "@/lib/get-course-or-404";
import { VideoLessonScreen } from "@/components/courses/VideoLessonScreen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = getCourseOrNotFound(slug);
  return { title: `סרטון עוז - ${course.meta.title} | אקדמיית איקום` };
}

export default async function CourseVideoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = getCourseOrNotFound(slug);
  return <VideoLessonScreen course={course} />;
}
