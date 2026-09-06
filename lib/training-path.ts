import { COURSE_SLUGS } from "@/lib/courses";
import type { CourseProgress, CourseSlug, OverallTrainingProgress, TrainingStepStatus } from "@/lib/types";

export interface StepStatusInfo {
  status: TrainingStepStatus;
  percent: number;
}

const STEP_ORDER = [
  "about-ecom",
  "courses",
  "oz-videos",
  "knowledge-exams",
  "sales-method",
  "simulations",
] as const;

function fraction(courseProgresses: Record<CourseSlug, CourseProgress>, pick: (cp?: CourseProgress) => boolean) {
  const done = COURSE_SLUGS.filter((slug) => pick(courseProgresses[slug])).length;
  return Math.round((done / COURSE_SLUGS.length) * 100);
}

/**
 * Turns the raw progress state into a status ("completed" | "current" |
 * "locked") + percent for each roadmap step, gating each step on the
 * previous one being fully complete - a simple, predictable linear
 * unlock order matching the roadmap in content/site/training-path.json.
 */
export function computeStepStatuses(
  overall: OverallTrainingProgress,
  courseProgresses: Record<CourseSlug, CourseProgress>
): Record<string, StepStatusInfo> {
  const playbooksPercent = fraction(courseProgresses, (cp) => (cp?.topicsCompleted.length ?? 0) >= 3);
  const videosPercent = fraction(courseProgresses, (cp) => !!cp?.videoWatched);
  const quizzesPercent = fraction(courseProgresses, (cp) => !!cp?.quizPassed);

  const percentById: Record<(typeof STEP_ORDER)[number], number> = {
    "about-ecom": overall.aboutEcomCompleted ? 100 : 0,
    courses: playbooksPercent,
    "oz-videos": videosPercent,
    "knowledge-exams": quizzesPercent,
    "sales-method": overall.salesMethodCompleted ? 100 : 0,
    simulations: 0,
  };

  const doneById: Record<(typeof STEP_ORDER)[number], boolean> = {
    "about-ecom": overall.aboutEcomCompleted,
    courses: playbooksPercent === 100,
    "oz-videos": videosPercent === 100,
    "knowledge-exams": quizzesPercent === 100,
    "sales-method": overall.salesMethodCompleted,
    simulations: false,
  };

  const result: Record<string, StepStatusInfo> = {};
  let previousDone = true;
  for (const id of STEP_ORDER) {
    const done = doneById[id];
    const status: TrainingStepStatus = done ? "completed" : previousDone ? "current" : "locked";
    result[id] = { status, percent: percentById[id] };
    previousDone = done;
  }
  return result;
}
