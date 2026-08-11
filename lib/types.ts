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
// ---------------------------------------------------------------------------

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation?: string;
}

export interface Quiz {
  title: string;
  passScore: number;
  questions: QuizQuestion[];
}

export interface QuizAttempt {
  id: string;
  courseSlug: CourseSlug;
  answers: Record<string, string>;
  score: number;
  passed: boolean;
  completedAt: string;
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
  aboutEcomCompleted: boolean;
  courses: Record<CourseSlug, CourseProgressState>;
  percent: number;
  currentStepId: string;
}
