import type { Metadata } from "next";
import type { CourseSlug, CourseTheme } from "@/lib/types";
import { COURSE_SLUGS } from "@/lib/courses";
import { getAboutEcomContent, getAllCourseMetas, getCourseTheme } from "@/lib/content/loader";
import { AboutEcomScreen } from "@/components/about/AboutEcomScreen";

export const metadata: Metadata = {
  title: "מי זאת איקום | אקדמיית איקום",
};

export default function AboutEcomPage() {
  const content = getAboutEcomContent();
  const courseMetas = getAllCourseMetas();
  const courseThemes = Object.fromEntries(
    COURSE_SLUGS.map((slug) => [slug, getCourseTheme(slug)])
  ) as Record<CourseSlug, CourseTheme>;

  return <AboutEcomScreen content={content} courseMetas={courseMetas} courseThemes={courseThemes} />;
}
