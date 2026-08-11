import type { Course, CourseProgress, TrainingStepStatus } from "@/lib/types";

export interface JourneyItem {
  id: string;
  type: "topic" | "video" | "quiz";
  title: string;
  href: string;
  status: TrainingStepStatus;
}

/**
 * Within a single course, gates topics -> video -> quiz in order: each item
 * unlocks once the previous one is complete. Mirrors the logic in
 * lib/training-path.ts but scoped to one course's own steps.
 */
export function computeCourseJourney(course: Course, progress: CourseProgress): JourneyItem[] {
  const slug = course.meta.slug;
  const items: JourneyItem[] = [];
  let previousDone = true;

  for (const topic of course.topics) {
    const done = progress.topicsCompleted.includes(topic.id);
    const status: TrainingStepStatus = done ? "completed" : previousDone ? "current" : "locked";
    items.push({
      id: topic.id,
      type: "topic",
      title: topic.title,
      href: `/courses/${slug}/playbook/${topic.index}`,
      status,
    });
    previousDone = done;
  }

  {
    const done = progress.videoWatched;
    const status: TrainingStepStatus = done ? "completed" : previousDone ? "current" : "locked";
    items.push({
      id: "video",
      type: "video",
      title: course.video.title,
      href: `/courses/${slug}/video`,
      status,
    });
    previousDone = done;
  }

  {
    const done = progress.quizPassed;
    const status: TrainingStepStatus = done ? "completed" : previousDone ? "current" : "locked";
    items.push({
      id: "quiz",
      type: "quiz",
      title: course.quiz.title,
      href: `/courses/${slug}/quiz`,
      status,
    });
  }

  return items;
}
