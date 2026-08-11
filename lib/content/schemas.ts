import { z } from "zod";

/**
 * Zod schemas describing every editable content file under /content.
 * These exist so that a malformed JSON edit fails loudly (with a clear
 * error naming the file) instead of silently breaking a page.
 * See CONTENT_GUIDE.md for the plain-language version of these rules.
 */

export const navigationItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  href: z.string(),
  icon: z.string(),
  comingSoon: z.boolean().optional(),
});

export const navigationSchema = z.object({
  primary: z.array(navigationItemSchema),
});

export const homeContentSchema = z.object({
  greetingSubtitle: z.string(),
  heroKicker: z.string(),
  continueCtaLabel: z.string(),
  startCtaLabel: z.string(),
  emptyActivityMessage: z.string(),
  sectionTitles: z.object({
    progress: z.string(),
    nextTask: z.string(),
    courses: z.string(),
    activity: z.string(),
  }),
});

export const statSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export const strengthSchema = z.object({
  icon: z.string(),
  title: z.string(),
  description: z.string(),
});

export const graduateStorySchema = z.object({
  name: z.string(),
  course: z.string(),
  quote: z.string(),
});

export const aboutEcomSchema = z.object({
  hero: z.object({
    kicker: z.string(),
    title: z.string(),
    description: z.string(),
  }),
  whoWeAre: z.object({
    title: z.string(),
    body: z.array(z.string()),
  }),
  keyNumbers: z.object({
    title: z.string(),
    stats: z.array(statSchema),
  }),
  strengths: z.object({
    title: z.string(),
    description: z.string(),
    items: z.array(strengthSchema),
  }),
  industryConnection: z.object({
    title: z.string(),
    body: z.array(z.string()),
    points: z.array(z.string()),
  }),
  graduateStories: z.object({
    title: z.string(),
    description: z.string(),
    stories: z.array(graduateStorySchema),
  }),
  placement: z.object({
    title: z.string(),
    body: z.array(z.string()),
    points: z.array(z.string()),
  }),
  studentSupport: z.object({
    title: z.string(),
    body: z.array(z.string()),
    points: z.array(z.string()),
  }),
  finalCta: z.object({
    title: z.string(),
    description: z.string(),
    buttonLabel: z.string(),
  }),
});

export const trainingStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  href: z.string(),
  icon: z.string(),
});

export const trainingPathSchema = z.object({
  title: z.string(),
  description: z.string(),
  steps: z.array(trainingStepSchema),
});

export const courseMetaSchema = z.object({
  slug: z.enum(["cyber", "ai", "fullstack", "ux-ui", "digital-marketing"]),
  title: z.string(),
  displayName: z.string(),
  subtitle: z.string(),
  shortDescription: z.string(),
  icon: z.string(),
  order: z.number(),
});

export const courseThemeSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  soft: z.string(),
  border: z.string(),
  glow: z.string(),
  textAccent: z.string(),
  gradientFrom: z.string(),
  gradientTo: z.string(),
});

export const courseOverviewSchema = z.object({
  heroTitle: z.string(),
  heroDescription: z.string(),
  fieldSummary: z.string(),
  highlights: z.array(z.string()),
});

export const topicFrontmatterSchema = z.object({
  title: z.string(),
  keyPoints: z.array(z.string()).default([]),
  salesTip: z.string().optional(),
  customerExplain: z.string().optional(),
});

export const videoLessonSchema = z.object({
  title: z.string(),
  description: z.string(),
  presenter: z.string(),
  url: z.string(),
  durationLabel: z.string(),
  transcript: z.string().optional(),
});

export const quizOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const quizQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(quizOptionSchema).min(2),
  correctOptionId: z.string(),
  explanation: z.string().optional(),
});

export const quizSchema = z.object({
  title: z.string(),
  passScore: z.number().min(0).max(100),
  questions: z.array(quizQuestionSchema).min(1),
});

export const comingSoonPageSchema = z.object({
  icon: z.string(),
  kicker: z.string(),
  title: z.string(),
  description: z.string(),
  upcoming: z.array(z.string()),
});

export type ComingSoonPageContent = z.infer<typeof comingSoonPageSchema>;
export type HomeContent = z.infer<typeof homeContentSchema>;
export type AboutEcomContent = z.infer<typeof aboutEcomSchema>;
export type TrainingPathContent = z.infer<typeof trainingPathSchema>;
export type NavigationContent = z.infer<typeof navigationSchema>;
