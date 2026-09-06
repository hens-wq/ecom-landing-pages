import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { ZodType } from "zod";

import type {
  Course,
  CourseMeta,
  CourseOverview,
  CourseSlug,
  CourseTheme,
  NavigationItem,
  Quiz,
  Topic,
  TrainingStep,
  VideoLesson,
} from "@/lib/types";
import { COURSE_SLUGS } from "@/lib/courses";
import {
  aboutEcomSchema,
  comingSoonPageSchema,
  courseMetaSchema,
  courseOverviewSchema,
  courseThemeSchema,
  homeContentSchema,
  introAlumniContentSchema,
  introArielSchema,
  introAudioSchema,
  introBrandSchema,
  introClosingSchema,
  introIndustrySchema,
  introInstructorsSchema,
  introStatsSchema,
  introStudentsSchema,
  introTrustSchema,
  introWelcomeSchema,
  navigationSchema,
  quizSchema,
  salesMethodSchema,
  topicFrontmatterSchema,
  trainingPathSchema,
  videoLessonSchema,
} from "@/lib/content/schemas";

const CONTENT_ROOT = path.join(process.cwd(), "content");

/**
 * Reads + parses a JSON content file and validates it against a zod schema.
 * Throws a clear, file-scoped error instead of letting malformed content
 * silently break a page render.
 */
function readJson<T>(relativePath: string, schema: ZodType<T>): T {
  const fullPath = path.join(CONTENT_ROOT, relativePath);
  let raw: string;
  try {
    raw = fs.readFileSync(fullPath, "utf-8");
  } catch {
    throw new Error(
      `[content] Missing content file: content/${relativePath}. See CONTENT_GUIDE.md.`
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `[content] content/${relativePath} is not valid JSON: ${(err as Error).message}`
    );
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `[content] content/${relativePath} failed validation:\n${result.error.issues
        .map((issue) => ` - ${issue.path.join(".")}: ${issue.message}`)
        .join("\n")}`
    );
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// Site content
// ---------------------------------------------------------------------------

export function getNavigation(): NavigationItem[] {
  return readJson("site/navigation.json", navigationSchema).primary;
}

export function getHomeContent() {
  return readJson("site/home.json", homeContentSchema);
}

export function getAboutEcomContent() {
  return readJson("site/about-ecom.json", aboutEcomSchema);
}

export function getTrainingPathSteps(): TrainingStep[] {
  return readJson("site/training-path.json", trainingPathSchema).steps;
}

export function getTrainingPathContent() {
  return readJson("site/training-path.json", trainingPathSchema);
}

export function getComingSoonPage(fileName: "simulations") {
  return readJson(`site/${fileName}.json`, comingSoonPageSchema);
}

export function getSalesMethodContent() {
  return readJson("site/sales-method.json", salesMethodSchema);
}

// ---------------------------------------------------------------------------
// Ecom intro (branded opening experience before the training flow)
// ---------------------------------------------------------------------------

function introDir(fileName: string) {
  return path.join("site", "ecom-intro", fileName);
}

export function getEcomIntroContent() {
  return {
    brand: readJson(introDir("brand.json"), introBrandSchema),
    welcome: readJson(introDir("welcome.json"), introWelcomeSchema),
    ariel: readJson(introDir("ariel.json"), introArielSchema),
    industry: readJson(introDir("industry.json"), introIndustrySchema),
    stats: readJson(introDir("stats.json"), introStatsSchema),
    alumni: readJson(introDir("alumni.json"), introAlumniContentSchema),
    instructors: readJson(introDir("instructors.json"), introInstructorsSchema),
    trust: readJson(introDir("trust.json"), introTrustSchema),
    closing: readJson(introDir("closing.json"), introClosingSchema),
    audio: readJson(introDir("audio.json"), introAudioSchema),
    students: readJson(introDir("students.json"), introStudentsSchema),
  };
}

export type EcomIntroContent = ReturnType<typeof getEcomIntroContent>;

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

function courseDir(slug: CourseSlug) {
  return path.join("courses", slug);
}

export function getCourseMeta(slug: CourseSlug): CourseMeta {
  return readJson(path.join(courseDir(slug), "meta.json"), courseMetaSchema);
}

export function getAllCourseMetas(): CourseMeta[] {
  return COURSE_SLUGS.map(getCourseMeta).sort((a, b) => a.order - b.order);
}

export function getCourseTheme(slug: CourseSlug): CourseTheme {
  return readJson(path.join(courseDir(slug), "theme.json"), courseThemeSchema);
}

export function getCourseOverview(slug: CourseSlug): CourseOverview {
  return readJson(path.join(courseDir(slug), "overview.json"), courseOverviewSchema);
}

export function getCourseVideo(slug: CourseSlug): VideoLesson {
  return readJson(path.join(courseDir(slug), "video.json"), videoLessonSchema);
}

export function getCourseQuiz(slug: CourseSlug): Quiz {
  return readJson(path.join(courseDir(slug), "quiz.json"), quizSchema);
}

export function getCourseTopics(slug: CourseSlug): Topic[] {
  const topicsPath = path.join(CONTENT_ROOT, courseDir(slug), "topics");
  let files: string[];
  try {
    files = fs
      .readdirSync(topicsPath)
      .filter((file) => file.endsWith(".mdx"))
      .sort();
  } catch {
    throw new Error(
      `[content] Missing topics folder: content/${courseDir(slug)}/topics. See CONTENT_GUIDE.md.`
    );
  }

  return files.map((file, index) => {
    const fullPath = path.join(topicsPath, file);
    const raw = fs.readFileSync(fullPath, "utf-8");
    const { data, content } = matter(raw);

    const result = topicFrontmatterSchema.safeParse(data);
    if (!result.success) {
      throw new Error(
        `[content] content/${courseDir(slug)}/topics/${file} frontmatter failed validation:\n${result.error.issues
          .map((issue) => ` - ${issue.path.join(".")}: ${issue.message}`)
          .join("\n")}`
      );
    }

    return {
      id: file.replace(/\.mdx$/, ""),
      index: index + 1,
      slug: file.replace(/\.mdx$/, ""),
      title: result.data.title,
      keyPoints: result.data.keyPoints,
      salesTip: result.data.salesTip,
      customerExplain: result.data.customerExplain,
      content,
    } satisfies Topic;
  });
}

export function getCourse(slug: CourseSlug): Course {
  return {
    meta: getCourseMeta(slug),
    theme: getCourseTheme(slug),
    overview: getCourseOverview(slug),
    topics: getCourseTopics(slug),
    video: getCourseVideo(slug),
    quiz: getCourseQuiz(slug),
  };
}
