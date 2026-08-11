import type { CourseProgressState, CourseSlug, QuizAttempt } from "@/lib/types";
import { defaultCourseState, defaultOverallState, type RawProgressState } from "@/lib/repositories/progress.repository";

/**
 * Demo-only progress presets, used by the "quick demo login" options on the
 * login page so the product can be visually reviewed at different stages of
 * completion without manually clicking through the whole flow.
 */

function makeAttempt(courseSlug: CourseSlug, score: number, passed: boolean): QuizAttempt {
  return {
    id: crypto.randomUUID(),
    courseSlug,
    answers: {},
    score,
    passed,
    completedAt: new Date().toISOString(),
  };
}

function makeCompletedCourseState(courseSlug: CourseSlug): CourseProgressState {
  return {
    topicsCompleted: ["topic-1", "topic-2", "topic-3"],
    videoWatched: true,
    attempts: [makeAttempt(courseSlug, 90, true)],
    bestScore: 90,
    quizPassed: true,
    completed: true,
    completedAt: new Date().toISOString(),
  };
}

function makeInProgressCourseState(topicsCompleted: string[], videoWatched: boolean): CourseProgressState {
  return {
    ...defaultCourseState(),
    topicsCompleted,
    videoWatched,
  };
}

export function newUserSeed(): RawProgressState {
  return defaultOverallState();
}

export function partialUserSeed(): RawProgressState {
  const state = defaultOverallState();
  state.aboutEcomCompleted = true;
  state.courses.cyber = makeCompletedCourseState("cyber");
  state.courses.ai = makeInProgressCourseState(["topic-1"], false);
  return state;
}

export function nearlyDoneUserSeed(): RawProgressState {
  const state = defaultOverallState();
  state.aboutEcomCompleted = true;
  state.courses.cyber = makeCompletedCourseState("cyber");
  state.courses.ai = makeCompletedCourseState("ai");
  state.courses.fullstack = makeCompletedCourseState("fullstack");
  state.courses["ux-ui"] = makeCompletedCourseState("ux-ui");
  state.courses["digital-marketing"] = makeInProgressCourseState(
    ["topic-1", "topic-2", "topic-3"],
    true
  );
  return state;
}
