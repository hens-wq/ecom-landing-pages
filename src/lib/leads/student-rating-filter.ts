import { effectiveStudentRating, isStudentRating } from "@/lib/lead-status/student-rating";

export type StudentRatingFilter = "ordinary" | "excellent" | "unrated";

export function matchesStudentRatingFilter(rating: number | null | undefined, filter: StudentRatingFilter | null): boolean {
  if (filter === null) return true;
  const effective = effectiveStudentRating(rating);
  const valid = isStudentRating(effective);
  if (filter === "unrated") return !valid;
  if (filter === "excellent") return effective === 4 || effective === 5;
  return effective === 2 || effective === 3;
}
