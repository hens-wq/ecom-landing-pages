import type { Metadata } from "next";
import type { CourseSlug, CourseTheme } from "@/lib/types";
import { COURSE_SLUGS } from "@/lib/courses";
import { getAllCourseMetas, getCourseTheme } from "@/lib/content/loader";
import { CourseHubScreen } from "@/components/courses/CourseHubScreen";

export const metadata: Metadata = {
  title: "הקורסים | מכללת Ecom",
};

export default function CoursesPage() {
  const courseMetas = getAllCourseMetas();
  const courseThemes = Object.fromEntries(
    COURSE_SLUGS.map((slug) => [slug, getCourseTheme(slug)])
  ) as Record<CourseSlug, CourseTheme>;

  return <CourseHubScreen courseMetas={courseMetas} courseThemes={courseThemes} />;
}
