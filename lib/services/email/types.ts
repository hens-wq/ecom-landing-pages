import type { AiEvaluationResult } from "@/lib/services/ai-evaluator/types";

/** One MCQ question as it should appear in the review email (Task 4E). */
export interface QuizReviewMcqRow {
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  points: number;
}

/**
 * Everything a human reviewer needs to grade one quiz submission, in one
 * place. Built server-side (see app/api/quiz/review/route.ts) from the
 * attempt the rep just submitted plus the AI evaluator's recommendation -
 * never assembled or sent from client code.
 */
export interface QuizReviewEmailPayload {
  repName: string;
  courseName: string;
  quizTitle: string;
  submittedAt: string;
  mcqRows: QuizReviewMcqRow[];
  mcqScore: number;
  mcqScoreMax: number;
  openQuestionPrompt: string;
  openAnswerText: string;
  aiEvaluation: AiEvaluationResult;
  /** mcqScore + aiEvaluation.suggestedScore, out of 100 - a suggestion only. */
  suggestedTotalScore: number;
}

export interface EmailService {
  sendQuizReviewEmail(payload: QuizReviewEmailPayload): Promise<void>;
}
