import type { CourseSlug } from "@/lib/types";

/**
 * Canonical list + display order of the five courses. This is the single
 * place that knows which course folders exist under /content/courses.
 * Adding a course = add its slug here + add its content folder
 * (see CONTENT_GUIDE.md).
 */
export const COURSE_SLUGS: CourseSlug[] = [
  "cyber",
  "ai",
  "fullstack",
  "ux-ui",
  "digital-marketing",
];

export function isCourseSlug(value: string): value is CourseSlug {
  return (COURSE_SLUGS as string[]).includes(value);
}
