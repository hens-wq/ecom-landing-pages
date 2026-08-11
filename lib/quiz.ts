import type { Quiz } from "@/lib/types";

export function scoreQuiz(quiz: Quiz, answers: Record<string, string>): number {
  const total = quiz.questions.length;
  if (total === 0) return 0;
  const correct = quiz.questions.filter((q) => answers[q.id] === q.correctOptionId).length;
  return Math.round((correct / total) * 100);
}
