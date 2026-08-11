import type { Metadata } from "next";
import { getCourseOrNotFound } from "@/lib/get-course-or-404";
import { QuizScreen } from "@/components/courses/QuizScreen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = getCourseOrNotFound(slug);
  return { title: `מבחן ידע - ${course.meta.title} | אקדמיית איקום` };
}

export default async function CourseQuizPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = getCourseOrNotFound(slug);
  return <QuizScreen course={course} />;
}
