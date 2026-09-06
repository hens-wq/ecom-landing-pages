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
  scenario: z.string(),
  promptIntro: z.string(),
  topics: z.array(z.string()).min(1),
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
    const mcqQuestions = quiz.questions.filter((q) => q.type === "multipleChoice");
    const openQuestions = quiz.questions.filter((q) => q.type === "openText");
    if (mcqQuestions.length !== 5 || openQuestions.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Every exam must have exactly 5 multiple-choice + 1 open-text question (found ${mcqQuestions.length} + ${openQuestions.length})`,
        path: ["questions"],
      });
    }
    if (mcqQuestions.some((q) => q.points !== 10)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Every multiple-choice question must be worth exactly 10 points",
        path: ["questions"],
      });
    }
    if (openQuestions.some((q) => q.points !== 50)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "The open-text question must be worth exactly 50 points",
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

export const introWelcomeFeatureSchema = z.object({
  /** Key into lib/icon-map.ts ICON_MAP */
  icon: z.string(),
  label: z.string(),
});

export const introWelcomeSchema = z.object({
  headline: z.string(),
  /** Each entry renders as its own line - the welcome screen wants an exact, guaranteed line break here, not text that happens to wrap. */
  supportingLine: z.array(z.string()).min(1),
  features: z.array(introWelcomeFeatureSchema).min(1),
  ctaLabel: z.string(),
});

export const introArielSchema = z.object({
  headline: z.string(),
  body: z.string(),
  benefits: z.array(z.string()).min(1),
  logoSrc: z.string(),
});

export const introLogoSchema = z.object({
  name: z.string(),
  src: z.string(),
});

export const introIndustrySchema = z.object({
  headline: z.string(),
  body: z.string(),
  logosCaption: z.string().optional(),
  logos: z.array(introLogoSchema).min(1),
  /** Real office/team photo for the "Great People Build Amazing Things" card - optional until the asset is provided. */
  officePhotoSrc: z.string().optional(),
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
  /** Verbatim approved phrase, e.g. "בן 36, גר באזור הצפון" - kept as one string rather than split age/location fields so gender agreement (בן/בת, גר/גרה) is never reconstructed. */
  subtitle: z.string().optional(),
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

export const introInstructorSchema = z.object({
  name: z.string(),
  photoSrc: z.string(),
  course: z.string().optional(),
  role: z.string().optional(),
  company: z.string().optional(),
  description: z.string().optional(),
});

export const introInstructorsSchema = z.object({
  headline: z.string(),
  body: z.string(),
  instructors: z.array(introInstructorSchema).min(1),
});

export const introTrustItemSchema = z.object({
  headline: z.string(),
  explanation: z.string(),
});

export const introTrustSchema = z.object({
  headline: z.string(),
  items: z.array(introTrustItemSchema).min(1),
});

export const introClosingOnboardingSchema = z.object({
  eyebrow: z.string(),
  steps: z.array(z.string()).min(1),
});

export const introClosingSchema = z.object({
  headline: z.string(),
  body: z.array(z.string()).min(1),
  onboarding: introClosingOnboardingSchema,
  ctaLabel: z.string(),
});

export const introAudioSchema = z.object({
  src: z.string().nullable(),
});

/**
 * Generic supporting human imagery (NOT real alumni or instructors) used
 * sparingly on informational screens. Keyed by placement id so a section
 * can look up its own slot and render nothing gracefully until a real
 * photo is added here - see content/site/ecom-intro/students.json.
 */
export const introStudentPhotoSchema = z.object({
  id: z.string(),
  photoSrc: z.string(),
});

export const introStudentsSchema = z.object({
  photos: z.array(introStudentPhotoSchema),
});

export type IntroBrandContent = z.infer<typeof introBrandSchema>;
export type IntroWelcomeContent = z.infer<typeof introWelcomeSchema>;
export type IntroArielContent = z.infer<typeof introArielSchema>;
export type IntroIndustryContent = z.infer<typeof introIndustrySchema>;
export type IntroStatsContent = z.infer<typeof introStatsSchema>;
export type IntroAlumniStory = z.infer<typeof introAlumniStorySchema>;
export type IntroAlumniContent = z.infer<typeof introAlumniContentSchema>;
export type IntroInstructor = z.infer<typeof introInstructorSchema>;
export type IntroInstructorsContent = z.infer<typeof introInstructorsSchema>;
export type IntroTrustItem = z.infer<typeof introTrustItemSchema>;
export type IntroTrustContent = z.infer<typeof introTrustSchema>;
export type IntroClosingContent = z.infer<typeof introClosingSchema>;
export type IntroAudioContent = z.infer<typeof introAudioSchema>;
export type IntroStudentPhoto = z.infer<typeof introStudentPhotoSchema>;
export type IntroStudentsContent = z.infer<typeof introStudentsSchema>;

// ---------------------------------------------------------------------------
// Sales Method module ("שיטת המכירה של Ecom") - built from the approved
// "שבוע הכשרה - נציגי מכירות" training-week deck. Every field here traces
// back to a specific slide; see content/site/sales-method.json comments in
// CONTENT_GUIDE.md before editing.
// ---------------------------------------------------------------------------

export const salesMethodPrincipleSchema = z.object({
  number: z.string(),
  title: z.string(),
  description: z.string(),
});

export const salesMethodTrackSalarySchema = z.object({
  entry: z.string(),
  afterExperience: z.string(),
  advanced: z.string(),
});

export const salesMethodTrackOverviewRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  suits: z.string(),
  salary: salesMethodTrackSalarySchema,
});

export const salesMethodTrackDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  courseNumber: z.number(),
  totalCourses: z.number(),
  headline: z.string(),
  salary: salesMethodTrackSalarySchema,
  /** Optional - not every track had a dedicated "what it is" slide in the source deck (see pendingNote when absent). */
  whatItIs: z.string().optional(),
  whoItSuits: z.string(),
  rolesAfter: z.string().optional(),
  pendingNote: z.string().optional(),
});

export const salesMethodMatchingQuadrantSchema = z.object({
  id: z.string(),
  column: z.enum(["dynamic", "technical"]),
  row: z.enum(["hasEnglish", "noEnglish"]),
  trackName: z.string(),
});

export const salesMethodCallStepSchema = z.object({
  number: z.number(),
  title: z.string(),
});

export const salesMethodRapportItemSchema = z.object({
  label: z.string(),
  description: z.string(),
});

export const salesMethodMentalityItemSchema = z.object({
  number: z.string(),
  title: z.string(),
  description: z.string(),
});

export const salesMethodSummaryPhaseSchema = z.object({
  number: z.number(),
  title: z.string(),
  description: z.string(),
});

const stepBase = {
  id: z.string(),
  number: z.number(),
  title: z.string(),
};

export const salesMethodMindsetStepSchema = z.object({
  ...stepBase,
  kind: z.literal("mindset"),
  description: z.string(),
  principles: z.array(salesMethodPrincipleSchema).min(1),
});

export const salesMethodCustomerStepSchema = z.object({
  ...stepBase,
  kind: z.literal("customer"),
  description: z.string(),
  motivations: z.array(z.string()).min(1),
  concerns: z.array(z.string()).min(1),
  profiles: z.array(z.string()).min(1),
  closingLine: z.string(),
});

export const salesMethodTracksOverviewStepSchema = z.object({
  ...stepBase,
  kind: z.literal("tracksOverview"),
  description: z.string(),
  salaryNote: z.string(),
  tracks: z.array(salesMethodTrackOverviewRowSchema).min(1),
});

export const salesMethodTrackCarouselStepSchema = z.object({
  ...stepBase,
  kind: z.literal("trackCarousel"),
  description: z.string(),
  tracks: z.array(salesMethodTrackDetailSchema).min(1),
});

export const salesMethodMatchingStepSchema = z.object({
  ...stepBase,
  kind: z.literal("matching"),
  description: z.string(),
  axisXLabels: z.object({ dynamic: z.string(), technical: z.string() }),
  axisYLabels: z.object({ hasEnglish: z.string(), noEnglish: z.string() }),
  quadrants: z.array(salesMethodMatchingQuadrantSchema).length(4),
  centerLabel: z.string(),
  centerNote: z.string(),
});

export const salesMethodCallTimelineStepSchema = z.object({
  ...stepBase,
  kind: z.literal("callTimeline"),
  description: z.string(),
  steps: z.array(salesMethodCallStepSchema).min(1),
  sideNote: z.string(),
});

export const salesMethodTrustStepSchema = z.object({
  ...stepBase,
  kind: z.literal("trust"),
  description: z.string(),
  rapportItems: z.array(salesMethodRapportItemSchema).min(1),
  energyTitle: z.string(),
  energyDescription: z.string(),
  energyDimensions: z.array(z.string()).min(1),
  warmthLabel: z.string(),
  warmthExamples: z.array(z.string()).min(1),
  authorityLabel: z.string(),
  authorityExamples: z.array(z.string()).min(1),
  insight: z.string(),
});

export const salesMethodDiagnosticStepSchema = z.object({
  ...stepBase,
  kind: z.literal("diagnostic"),
  description: z.string(),
  exercise: z.string(),
  sampleQuestions: z.array(z.string()).min(1),
  toolConnection: z.string(),
});

export const salesMethodMentalityStepSchema = z.object({
  ...stepBase,
  kind: z.literal("mentality"),
  description: z.string(),
  items: z.array(salesMethodMentalityItemSchema).min(1),
  personalStory: z.string(),
  objectionsNote: z.string(),
  summaryTitle: z.string(),
  summaryDescription: z.string(),
  summaryPhases: z.array(salesMethodSummaryPhaseSchema).min(1),
  throughoutTitle: z.string(),
  throughoutDescription: z.string(),
});

export const salesMethodStepSchema = z.discriminatedUnion("kind", [
  salesMethodMindsetStepSchema,
  salesMethodCustomerStepSchema,
  salesMethodTracksOverviewStepSchema,
  salesMethodTrackCarouselStepSchema,
  salesMethodMatchingStepSchema,
  salesMethodCallTimelineStepSchema,
  salesMethodTrustStepSchema,
  salesMethodDiagnosticStepSchema,
  salesMethodMentalityStepSchema,
]);

export const salesMethodSchema = z.object({
  steps: z.array(salesMethodStepSchema).min(1),
  completion: z.object({
    title: z.string(),
    description: z.string(),
    buttonLabel: z.string(),
  }),
});

export type SalesMethodStep = z.infer<typeof salesMethodStepSchema>;
export type SalesMethodContent = z.infer<typeof salesMethodSchema>;

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
