import { COURSE_SLUGS } from "@/lib/courses";
import type {
  CourseProgress,
  CourseProgressState,
  CourseSlug,
  OverallTrainingProgress,
  QuizAttempt,
  QuizDraft,
  QuizOpenAnswerRecord,
} from "@/lib/types";

/**
 * Progress abstraction. Nothing outside this file touches localStorage.
 * Swapping to a real backend later means writing a DatabaseProgressRepository
 * that implements the same interface - no UI changes required.
 */
export interface SubmitQuizAttemptInput {
  mcqAnswers: Record<string, string>;
  openAnswers: QuizOpenAnswerRecord[];
  pointsEarned: number;
  pointsAutoMax: number;
  pointsTotalPossible: number;
  passScore: number;
}

export interface ProgressRepository {
  getOverallProgress(userId: string): Promise<OverallTrainingProgress>;
  getCourseProgress(userId: string, courseSlug: CourseSlug): Promise<CourseProgress>;
  markIntroComplete(userId: string): Promise<void>;
  markAboutEcomComplete(userId: string): Promise<void>;
  markSalesMethodComplete(userId: string): Promise<void>;
  saveSalesMethodStep(userId: string, step: number): Promise<void>;
  markTopicComplete(userId: string, courseSlug: CourseSlug, topicId: string): Promise<void>;
  markVideoWatched(userId: string, courseSlug: CourseSlug): Promise<void>;
  submitQuizAttempt(
    userId: string,
    courseSlug: CourseSlug,
    input: SubmitQuizAttemptInput
  ): Promise<CourseProgress>;
  getQuizDraft(userId: string, courseSlug: CourseSlug): Promise<QuizDraft | null>;
  saveQuizDraft(userId: string, courseSlug: CourseSlug, draft: QuizDraft): Promise<void>;
  clearQuizDraft(userId: string, courseSlug: CourseSlug): Promise<void>;
  resetProgress(userId: string): Promise<void>;
  seedProgress(userId: string, state: RawProgressState): Promise<void>;
}

interface RawProgressState {
  introCompleted: boolean;
  aboutEcomCompleted: boolean;
  salesMethodCompleted: boolean;
  salesMethodStep: number;
  courses: Record<CourseSlug, CourseProgressState>;
}

const TOPICS_PER_COURSE = 3;
// Units contributing to overall completion: "who is ECOM" + each of the 5 courses.
const OVERALL_UNITS = 1 + COURSE_SLUGS.length;

export function defaultCourseState(): CourseProgressState {
  return {
    topicsCompleted: [],
    videoWatched: false,
    attempts: [],
    bestScore: 0,
    quizPassed: false,
    completed: false,
  };
}

export function defaultOverallState(): RawProgressState {
  return {
    introCompleted: false,
    aboutEcomCompleted: false,
    salesMethodCompleted: false,
    salesMethodStep: 0,
    courses: Object.fromEntries(
      COURSE_SLUGS.map((slug) => [slug, defaultCourseState()])
    ) as Record<CourseSlug, CourseProgressState>,
  };
}

function computeCourseProgress(slug: CourseSlug, state: CourseProgressState): CourseProgress {
  const completedUnits =
    Math.min(state.topicsCompleted.length, TOPICS_PER_COURSE) +
    (state.videoWatched ? 1 : 0) +
    (state.quizPassed ? 1 : 0);
  const totalUnits = TOPICS_PER_COURSE + 2; // topics + video + quiz
  return {
    slug,
    ...state,
    percent: Math.round((completedUnits / totalUnits) * 100),
  };
}

function computeOverallProgress(state: RawProgressState): OverallTrainingProgress {
  const completedCourses = COURSE_SLUGS.filter((slug) => state.courses[slug]?.completed).length;
  const completedUnits = (state.aboutEcomCompleted ? 1 : 0) + completedCourses;
  const percent = Math.round((completedUnits / OVERALL_UNITS) * 100);

  let currentStepId = "about-ecom";
  if (state.aboutEcomCompleted) {
    const nextCourse = COURSE_SLUGS.find((slug) => !state.courses[slug]?.completed);
    currentStepId = nextCourse ? "courses" : state.salesMethodCompleted ? "simulations" : "sales-method";
  }

  return { ...state, percent, currentStepId };
}

class LocalProgressRepository implements ProgressRepository {
  private key(userId: string) {
    return `ecom-lms:progress:${userId}`;
  }

  private draftKey(userId: string, courseSlug: CourseSlug) {
    return `ecom-lms:quiz-draft:${userId}:${courseSlug}`;
  }

  private read(userId: string): RawProgressState {
    if (typeof window === "undefined") return defaultOverallState();
    const raw = window.localStorage.getItem(this.key(userId));
    if (!raw) return defaultOverallState();
    try {
      const parsed = JSON.parse(raw) as RawProgressState;
      // Merge with defaults in case new courses were added since this was saved.
      return {
        introCompleted: parsed.introCompleted ?? false,
        aboutEcomCompleted: parsed.aboutEcomCompleted ?? false,
        salesMethodCompleted: parsed.salesMethodCompleted ?? false,
        salesMethodStep: parsed.salesMethodStep ?? 0,
        courses: {
          ...defaultOverallState().courses,
          ...parsed.courses,
        },
      };
    } catch {
      return defaultOverallState();
    }
  }

  private write(userId: string, state: RawProgressState) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(this.key(userId), JSON.stringify(state));
  }

  async getOverallProgress(userId: string): Promise<OverallTrainingProgress> {
    return computeOverallProgress(this.read(userId));
  }

  async getCourseProgress(userId: string, courseSlug: CourseSlug): Promise<CourseProgress> {
    const state = this.read(userId);
    return computeCourseProgress(courseSlug, state.courses[courseSlug] ?? defaultCourseState());
  }

  async markIntroComplete(userId: string): Promise<void> {
    const state = this.read(userId);
    state.introCompleted = true;
    this.write(userId, state);
  }

  async markAboutEcomComplete(userId: string): Promise<void> {
    const state = this.read(userId);
    state.aboutEcomCompleted = true;
    this.write(userId, state);
  }

  async markSalesMethodComplete(userId: string): Promise<void> {
    const state = this.read(userId);
    state.salesMethodCompleted = true;
    this.write(userId, state);
  }

  async saveSalesMethodStep(userId: string, step: number): Promise<void> {
    const state = this.read(userId);
    state.salesMethodStep = Math.max(state.salesMethodStep, step);
    this.write(userId, state);
  }

  async markTopicComplete(userId: string, courseSlug: CourseSlug, topicId: string): Promise<void> {
    const state = this.read(userId);
    const course = state.courses[courseSlug] ?? defaultCourseState();
    if (!course.topicsCompleted.includes(topicId)) {
      course.topicsCompleted = [...course.topicsCompleted, topicId];
    }
    state.courses[courseSlug] = course;
    this.write(userId, state);
  }

  async markVideoWatched(userId: string, courseSlug: CourseSlug): Promise<void> {
    const state = this.read(userId);
    const course = state.courses[courseSlug] ?? defaultCourseState();
    course.videoWatched = true;
    state.courses[courseSlug] = course;
    this.write(userId, state);
  }

  async submitQuizAttempt(
    userId: string,
    courseSlug: CourseSlug,
    input: SubmitQuizAttemptInput
  ): Promise<CourseProgress> {
    const state = this.read(userId);
    const course = state.courses[courseSlug] ?? defaultCourseState();
    // No final score or pass/fail exists until every open-text answer has
    // been graded (see QuizOpenAnswerRecord.status) - the multiple-choice
    // portion alone is never presented or treated as the exam result.
    const allOpenGraded = input.openAnswers.every((a) => a.status === "graded");
    const openPointsEarned = input.openAnswers.reduce(
      (sum, a) => sum + (a.status === "graded" ? (a.score ?? 0) : 0),
      0
    );
    const evaluationStatus: QuizAttempt["evaluationStatus"] = allOpenGraded
      ? "graded"
      : "pending_review";
    const score = allOpenGraded
      ? Math.round(((input.pointsEarned + openPointsEarned) / input.pointsTotalPossible) * 100)
      : null;
    const passed = allOpenGraded ? score! >= input.passScore : null;

    const attempt: QuizAttempt = {
      id: crypto.randomUUID(),
      courseSlug,
      mcqAnswers: input.mcqAnswers,
      openAnswers: input.openAnswers,
      pointsEarned: input.pointsEarned,
      pointsAutoMax: input.pointsAutoMax,
      pointsTotalPossible: input.pointsTotalPossible,
      evaluationStatus,
      score,
      passed,
      completedAt: new Date().toISOString(),
    };

    course.attempts = [...course.attempts, attempt];
    if (evaluationStatus === "graded") {
      course.bestScore = Math.max(course.bestScore, score ?? 0);
      course.quizPassed = course.quizPassed || !!passed;
      if (course.quizPassed && !course.completed) {
        course.completed = true;
        course.completedAt = new Date().toISOString();
      }
    }

    state.courses[courseSlug] = course;
    this.write(userId, state);
    await this.clearQuizDraft(userId, courseSlug);
    return computeCourseProgress(courseSlug, course);
  }

  async getQuizDraft(userId: string, courseSlug: CourseSlug): Promise<QuizDraft | null> {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(this.draftKey(userId, courseSlug));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as QuizDraft;
    } catch {
      return null;
    }
  }

  async saveQuizDraft(userId: string, courseSlug: CourseSlug, draft: QuizDraft): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(this.draftKey(userId, courseSlug), JSON.stringify(draft));
  }

  async clearQuizDraft(userId: string, courseSlug: CourseSlug): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(this.draftKey(userId, courseSlug));
  }

  async resetProgress(userId: string): Promise<void> {
    this.write(userId, defaultOverallState());
  }

  async seedProgress(userId: string, seedState: RawProgressState): Promise<void> {
    this.write(userId, seedState);
  }
}

export const progressRepository: ProgressRepository = new LocalProgressRepository();
export type { RawProgressState };
