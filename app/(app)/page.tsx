import type { Metadata } from "next";
import type { CourseSlug, CourseTheme } from "@/lib/types";
import { COURSE_SLUGS } from "@/lib/courses";
import { getAllCourseMetas, getCourseTheme, getHomeContent } from "@/lib/content/loader";
import { DashboardScreen } from "@/components/dashboard/DashboardScreen";

export const metadata: Metadata = {
  title: "בית | אקדמיית איקום",
};

export default function DashboardPage() {
  const home = getHomeContent();
  const courseMetas = getAllCourseMetas();
  const courseThemes = Object.fromEntries(
    COURSE_SLUGS.map((slug) => [slug, getCourseTheme(slug)])
  ) as Record<CourseSlug, CourseTheme>;

  return <DashboardScreen home={home} courseMetas={courseMetas} courseThemes={courseThemes} />;
}
