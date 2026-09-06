/**
 * Server-side AI evaluator contract (Task 4F). Given the exact open question,
 * the rep's answer, that course's hidden rubric and its actual learning
 * material, a real implementation should return a structured *recommendation*
 * for a human reviewer - never an automatic grade. Nothing here may be
 * called from client code: implementations that call a real AI provider
 * need an API key, and API keys must stay server-only.
 */

export interface AiEvaluationCriterion {
  /** One of the 5 rubric line items, verbatim. */
  criterion: string;
  /** 0-10. */
  score: number;
}

export interface AiEvaluationResult {
  /** Exactly 5 entries, one per rubric line item. */
  criteria: AiEvaluationCriterion[];
  /** Sum of the 5 criteria scores, out of 50. */
  suggestedScore: number;
  /** Short, concrete explanation a human reviewer can scan in seconds. */
  explanation: string;
  /** Points the rep's answer covered well. */
  strengthsCovered: string[];
  /** Important points that were missing or inaccurate. */
  gapsOrInaccuracies: string[];
}

export interface AiEvaluationInput {
  courseName: string;
  /** The flattened open question (scenario + intro + topics) - see lib/quiz.ts openTextFullPrompt. */
  questionPrompt: string;
  answerText: string;
  /** The hidden 5-line grading rubric for this question - never shown to the rep. */
  rubric: string[];
  /**
   * The course's actual learning material (topic content), so grading is
   * anchored to what was really taught - not generic outside knowledge.
   */
  courseMaterial: string;
}

export interface AiEvaluatorService {
  evaluateOpenAnswer(input: AiEvaluationInput): Promise<AiEvaluationResult>;
}
