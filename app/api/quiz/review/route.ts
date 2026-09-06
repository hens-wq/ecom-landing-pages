import { NextResponse } from "next/server";
import { z } from "zod";
import { courseMetaSchema } from "@/lib/content/schemas";
import { getCourseMeta, getCourseTopics } from "@/lib/content/loader";
import { aiEvaluatorService } from "@/lib/services/ai-evaluator";
import { emailService } from "@/lib/services/email";
import type { QuizReviewMcqRow } from "@/lib/services/email";

/**
 * Task 4E/4F server boundary: takes a just-submitted quiz attempt, asks the
 * (currently stubbed) AI evaluator for a grading recommendation anchored to
 * this course's real material, and asks the (currently stubbed) email
 * service to deliver a structured review email. Nothing here is called by
 * client code without going through this route, so provider API keys and
 * QUIZ_REVIEW_EMAIL never reach the browser.
 *
 * This route never mutates quiz-attempt state - it only reads the
 * submission the client already persisted and fans it out for human
 * review. A failure here is caught and reported as { ok: false } instead
 * of thrown, so it can never affect the rep's already-submitted attempt.
 */

const mcqRowSchema = z.object({
  question: z.string(),
  selectedAnswer: z.string(),
  correctAnswer: z.string(),
  isCorrect: z.boolean(),
  points: z.number(),
});

const requestSchema = z.object({
  courseSlug: courseMetaSchema.shape.slug,
  quizTitle: z.string(),
  repName: z.string(),
  submittedAt: z.string(),
  mcqRows: z.array(mcqRowSchema),
  mcqScore: z.number(),
  mcqScoreMax: z.number(),
  openQuestionPrompt: z.string(),
  openAnswerText: z.string(),
  rubric: z.array(z.string()).min(1),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const input = parsed.data;

  try {
    const courseMeta = getCourseMeta(input.courseSlug);
    const courseMaterial = getCourseTopics(input.courseSlug)
      .map((topic) => `## ${topic.title}\n${topic.content}`)
      .join("\n\n");

    const aiEvaluation = await aiEvaluatorService.evaluateOpenAnswer({
      courseName: courseMeta.title,
      questionPrompt: input.openQuestionPrompt,
      answerText: input.openAnswerText,
      rubric: input.rubric,
      courseMaterial,
    });

    const mcqRows: QuizReviewMcqRow[] = input.mcqRows;

    await emailService.sendQuizReviewEmail({
      repName: input.repName,
      courseName: courseMeta.title,
      quizTitle: input.quizTitle,
      submittedAt: input.submittedAt,
      mcqRows,
      mcqScore: input.mcqScore,
      mcqScoreMax: input.mcqScoreMax,
      openQuestionPrompt: input.openQuestionPrompt,
      openAnswerText: input.openAnswerText,
      aiEvaluation,
      // A recommendation only - never the rep's official grade. See lib/services/ai-evaluator/types.ts.
      suggestedTotalScore: input.mcqScore + aiEvaluation.suggestedScore,
    });

    return NextResponse.json({ ok: true, aiEvaluation });
  } catch (err) {
    console.error("[api/quiz/review] failed to run AI evaluation / send review email", err);
    return NextResponse.json({ ok: false, error: "review_pipeline_failed" }, { status: 500 });
  }
}
