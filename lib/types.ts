/**
 * Core data models for the ECOM Academy sales training platform.
 * These types are the contract between the content layer (JSON/MDX files
 * under /content) and the UI. Keep them stable — content authors rely on
 * the shapes described here (see zod schemas in lib/content/schemas.ts).
 */

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  startDate?: string;
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  comingSoon?: boolean;
}

// ---------------------------------------------------------------------------
// Course theming (derived from the course cover artwork)
// ---------------------------------------------------------------------------

export interface CourseTheme {
  primary: string;
  secondary: string;
  soft: string;
  border: string;
  glow: string;
  textAccent: string;
  gradientFrom: string;
  gradientTo: string;
}

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

export type CourseSlug = "cyber" | "ai" | "fullstack" | "ux-ui" | "digital-marketing";

export interface CourseMeta {
  slug: CourseSlug;
  title: string;
  displayName: string;
  subtitle: string;
  shortDescription: string;
  icon: string;
  order: number;
}

export interface CourseOverview {
  heroTitle: string;
  heroDescription: string;
  fieldSummary: string;
  highlights: string[];
}

export interface Topic {
  id: string;
  index: number;
  slug: string;
  title: string;
  keyPoints: string[];
  salesTip?: string;
  customerExplain?: string;
  content: string; // raw MDX source
}

export interface VideoLesson {
  title: string;
  description: string;
  presenter: string;
  url: string;
  durationLabel: string;
  transcript?: string;
}

// ---------------------------------------------------------------------------
// Quiz engine
//
// A "knowledge exam" mixes auto-graded multiple-choice questions with
// open-text questions that need human (or future AI) review. Each question
// carries its own point value; the exam's questions must sum to
// `pointsTotalPossible` (validated in lib/content/schemas.ts). Only the
// multiple-choice portion is auto-graded today. A final score and pass/fail
// verdict only exist once every open-text answer has been graded — see
// `QuizAttempt.evaluationStatus` and lib/repositories/progress.repository.ts.
// ---------------------------------------------------------------------------

export interface QuizOption {
  id: string;
  text: string;
}

export interface MultipleChoiceQuestion {
  id: string;
  type: "multipleChoice";
  question: string;
  points: number;
  options: QuizOption[];
  correctOptionId: string;
  explanation?: string;
}

export interface OpenTextQuestion {
  id: string;
  type: "openText";
  /** Short scenario/intro framing the question (e.g. "a customer asks you..."). */
  scenario: string;
  /** The connecting line before the topic list, e.g. "ענה במילים שלך והתייחס לנקודות הבאות:". */
  promptIntro: string;
  /** The topics the rep is asked to address, rendered as separate bullets — never the hidden rubric. */
  topics: string[];
  points: number;
  /** Internal grading notes for a human or future AI reviewer — never shown to the rep. */
  rubric: string[];
}

export type QuizQuestion = MultipleChoiceQuestion | OpenTextQuestion;

export interface QuizIntro {
  title: string;
  description: string[];
  reminder: string;
  materialsNote: string;
  goodLuck: string;
}

export interface Quiz {
  title: string;
  /** Pass threshold, as a percentage of the auto-gradable (multiple-choice) points. */
  passScore: number;
  intro: QuizIntro;
  questions: QuizQuestion[];
  /** Shown just before submission. May include a {{courseName}} placeholder. */
  closingNote: string;
}

export interface QuizOpenAnswerRecord {
  questionId: string;
  answerText: string;
  points: number;
  rubric: string[];
  status: "pending" | "graded";
  score?: number;
}

export type QuizEvaluationStatus = "pending_review" | "graded";

export interface QuizAttempt {
  id: string;
  courseSlug: CourseSlug;
  mcqAnswers: Record<string, string>;
  openAnswers: QuizOpenAnswerRecord[];
  /** Points earned on the auto-graded multiple-choice portion (out of pointsAutoMax). */
  pointsEarned: number;
  /** Max auto-gradable points — the multiple-choice portion (e.g. 50). */
  pointsAutoMax: number;
  /** Full exam point value — multiple-choice + open-text (e.g. 100). */
  pointsTotalPossible: number;
  /** "pending_review" until every open-text answer in `openAnswers` has status "graded". */
  evaluationStatus: QuizEvaluationStatus;
  /** Final percentage (MCQ + graded open-text points) out of 100. Null until evaluationStatus is "graded". */
  score: number | null;
  /** Pass/fail against quiz.passScore. Null until evaluationStatus is "graded". */
  passed: boolean | null;
  completedAt: string;
}

export interface QuizDraft {
  currentIndex: number;
  mcqAnswers: Record<string, string>;
  openAnswers: Record<string, string>;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Course bundle (everything content-driven about one course)
// ---------------------------------------------------------------------------

export interface Course {
  meta: CourseMeta;
  theme: CourseTheme;
  overview: CourseOverview;
  topics: Topic[];
  video: VideoLesson;
  quiz: Quiz;
}

// ---------------------------------------------------------------------------
// Training roadmap
// ---------------------------------------------------------------------------

export type TrainingStepStatus = "completed" | "current" | "locked";

export interface TrainingStep {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;
}

export interface TrainingStepWithStatus extends TrainingStep {
  status: TrainingStepStatus;
  percent: number;
}

// ---------------------------------------------------------------------------
// Progress (persisted locally, behind ProgressRepository)
// ---------------------------------------------------------------------------

export interface CourseProgressState {
  topicsCompleted: string[];
  videoWatched: boolean;
  attempts: QuizAttempt[];
  bestScore: number;
  quizPassed: boolean;
  completed: boolean;
  completedAt?: string;
}

export interface CourseProgress extends CourseProgressState {
  slug: CourseSlug;
  percent: number;
}

export interface OverallTrainingProgress {
  /** Has the rep finished the branded "who is Ecom" opening experience? */
  introCompleted: boolean;
  aboutEcomCompleted: boolean;
  salesMethodCompleted: boolean;
  /** Index (0-based) of the last Sales Method step the rep reached - lets them resume instead of restarting. */
  salesMethodStep: number;
  courses: Record<CourseSlug, CourseProgressState>;
  percent: number;
  currentStepId: string;
}
