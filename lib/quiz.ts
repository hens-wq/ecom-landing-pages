import type { MultipleChoiceQuestion, OpenTextQuestion, Quiz, QuizQuestion } from "@/lib/types";

export function isMultipleChoice(q: QuizQuestion): q is MultipleChoiceQuestion {
  return q.type === "multipleChoice";
}

export function isOpenText(q: QuizQuestion): q is OpenTextQuestion {
  return q.type === "openText";
}

/**
 * Only the multiple-choice portion of an exam is auto-graded today - open
 * text questions are stored with status "pending" for a human or future AI
 * evaluator (see QuizOpenAnswerRecord). `pointsEarned`/`pointsAutoMax` are
 * used to compute the pass/fail percentage against `quiz.passScore`.
 */
export function scoreMultipleChoice(
  quiz: Quiz,
  mcqAnswers: Record<string, string>
): { pointsEarned: number; pointsAutoMax: number } {
  const mcqQuestions = quiz.questions.filter(isMultipleChoice);
  const pointsAutoMax = mcqQuestions.reduce((sum, q) => sum + q.points, 0);
  const pointsEarned = mcqQuestions.reduce(
    (sum, q) => sum + (mcqAnswers[q.id] === q.correctOptionId ? q.points : 0),
    0
  );
  return { pointsEarned, pointsAutoMax };
}

export function totalPossiblePoints(quiz: Quiz): number {
  return quiz.questions.reduce((sum, q) => sum + q.points, 0);
}

export function questionPointsLabel(question: QuizQuestion): string {
  return isMultipleChoice(question)
    ? `אמריקאית (${question.points} נקודות)`
    : `פתוחה (${question.points} נקודות)`;
}

/**
 * Reconstructs the open-text question as one flattened prompt (scenario +
 * intro line + topics) - used anywhere the full question text is needed as
 * a single string rather than its structured display form: the results
 * review, the review email (Task 4E), and the AI evaluator (Task 4F).
 * Never includes the hidden rubric.
 */
export function openTextFullPrompt(question: OpenTextQuestion): string {
  const bullets = question.topics.map((t) => `- ${t}`).join("\n");
  return `${question.scenario}\n\n${question.promptIntro}\n${bullets}`;
}
