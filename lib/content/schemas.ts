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

export const multipleChoiceQuestionSchema = z
  .object({
    id: z.string(),
    type: z.literal("multipleChoice"),
    question: z.string(),
    points: z.number().positive(),
    options: z.array(quizOptionSchema).min(2),
    correctOptionId: z.string(),
    explanation: z.string().optional(),
  })
  .refine((q) => q.options.some((o) => o.id === q.correctOptionId), {
    message: "correctOptionId must match one of this question's option ids",
    path: ["correctOptionId"],
  });

export const openTextQuestionSchema = z.object({
  id: z.string(),
  type: z.literal("openText"),
  question: z.string(),
  points: z.number().positive(),
  rubric: z.array(z.string()).min(1),
});

export const quizQuestionSchema = z.discriminatedUnion("type", [
  multipleChoiceQuestionSchema,
  openTextQuestionSchema,
]);

export const quizIntroSchema = z.object({
  title: z.string(),
  description: z.array(z.string()).min(1),
  reminder: z.string(),
  materialsNote: z.string(),
  goodLuck: z.string(),
});

export const quizSchema = z
  .object({
    title: z.string(),
    passScore: z.number().min(0).max(100),
    intro: quizIntroSchema,
    questions: z.array(quizQuestionSchema).min(1),
    closingNote: z.string(),
  })
  .superRefine((quiz, ctx) => {
    const mcqCount = quiz.questions.filter((q) => q.type === "multipleChoice").length;
    const openCount = quiz.questions.filter((q) => q.type === "openText").length;
    if (mcqCount !== 10 || openCount !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Every exam must have exactly 10 multiple-choice + 2 open-text questions (found ${mcqCount} + ${openCount})`,
        path: ["questions"],
      });
    }
    const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
    if (totalPoints !== 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Exam question points must sum to 100 (found ${totalPoints})`,
        path: ["questions"],
      });
    }
    const ids = quiz.questions.map((q) => q.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Question ids must be unique within the exam",
        path: ["questions"],
      });
    }
  });

// ---------------------------------------------------------------------------
// Ecom intro (branded opening experience before the training flow)
// ---------------------------------------------------------------------------

export const introBrandSchema = z.object({
  logoStackedSrc: z.string(),
  logoHorizontalSrc: z.string(),
  logoMarkSrc: z.string(),
});

export const introWelcomeSchema = z.object({
  headline: z.string(),
  supportingLine: z.string(),
  additionalLine: z.string(),
  ctaLabel: z.string(),
});

export const introCourseAreaSchema = z.object({
  label: z.string(),
  icon: z.string(),
});

export const introWhoIsEcomSchema = z.object({
  headline: z.string(),
  statement: z.string(),
  courseAreas: z.array(introCourseAreaSchema).min(1),
  supportingStatement: z.string(),
});

export const introArielSchema = z.object({
  headline: z.string(),
  body: z.string(),
  applicablePrograms: z.array(z.string()).min(1),
  clarification: z.string().optional(),
  logoSrc: z.string(),
});

export const introLogoSchema = z.object({
  name: z.string(),
  src: z.string(),
});

export const introIndustrySchema = z.object({
  headline: z.string(),
  alternativeHeadline: z.string(),
  body: z.string(),
  logos: z.array(introLogoSchema).min(1),
});

export const introJourneySchema = z.object({
  headline: z.string(),
  body: z.string(),
  steps: z.array(z.string()).min(1),
});

export const introStatSchema = z.object({
  value: z.number(),
  suffix: z.string().default(""),
  decimals: z.number().int().min(0).max(2).default(0),
  label: z.string(),
});

export const introStatsSchema = z.object({
  headline: z.string(),
  stats: z.array(introStatSchema).min(1),
});

export const introAlumniStorySchema = z.object({
  id: z.string(),
  name: z.string(),
  course: z.string(),
  roleBefore: z.string().optional(),
  roleAfter: z.string().optional(),
  company: z.string().optional(),
  quote: z.string().optional(),
  story: z.string().optional(),
  photoSrc: z.string(),
  videoSrc: z.string().optional(),
});

export const introAlumniContentSchema = z.object({
  successStories: z.object({
    headline: z.string(),
    supportingLine: z.string(),
  }),
  videosSection: z.object({
    headline: z.string(),
    supportingLine: z.string(),
  }),
  stories: z.array(introAlumniStorySchema).min(1),
});

export const introCommunityPhotoSchema = z.object({
  name: z.string(),
  photoSrc: z.string(),
});

export const introCommunitySchema = z.object({
  headline: z.string(),
  body: z.string(),
  terms: z.array(z.string()).min(1),
  photos: z.array(introCommunityPhotoSchema).min(1),
});

export const introTrustSchema = z.object({
  headline: z.string(),
  items: z.array(z.string()).min(1),
});

export const introClosingSchema = z.object({
  headline: z.string(),
  body: z.array(z.string()).min(1),
  supportingLine: z.string(),
  ctaLabel: z.string(),
});

export const introAudioSchema = z.object({
  src: z.string().nullable(),
});

export type IntroBrandContent = z.infer<typeof introBrandSchema>;
export type IntroWelcomeContent = z.infer<typeof introWelcomeSchema>;
export type IntroWhoIsEcomContent = z.infer<typeof introWhoIsEcomSchema>;
export type IntroArielContent = z.infer<typeof introArielSchema>;
export type IntroIndustryContent = z.infer<typeof introIndustrySchema>;
export type IntroJourneyContent = z.infer<typeof introJourneySchema>;
export type IntroStatsContent = z.infer<typeof introStatsSchema>;
export type IntroAlumniStory = z.infer<typeof introAlumniStorySchema>;
export type IntroAlumniContent = z.infer<typeof introAlumniContentSchema>;
export type IntroCommunityContent = z.infer<typeof introCommunitySchema>;
export type IntroTrustContent = z.infer<typeof introTrustSchema>;
export type IntroClosingContent = z.infer<typeof introClosingSchema>;
export type IntroAudioContent = z.infer<typeof introAudioSchema>;

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
