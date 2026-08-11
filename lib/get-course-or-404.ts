import { notFound } from "next/navigation";
import { isCourseSlug } from "@/lib/courses";
import { getCourse } from "@/lib/content/loader";
import type { Course } from "@/lib/types";

export function getCourseOrNotFound(slugParam: string): Course {
  if (!isCourseSlug(slugParam)) {
    notFound();
  }
  return getCourse(slugParam);
}
