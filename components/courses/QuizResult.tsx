import Link from "next/link";
import { ArrowLeft, Check, Clock, RotateCcw, X } from "lucide-react";
import type { Quiz } from "@/lib/types";
import { isMultipleChoice, totalPossiblePoints } from "@/lib/quiz";
import { ThemedAccentBackground } from "@/components/shared/GeometricDecor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function QuizResult({
  quiz,
  mcqAnswers,
  openAnswersText,
  pointsEarned,
  pointsAutoMax,
  passed,
  bestScore,
  attemptsCount,
  onRetry,
  continueHref,
}: {
  quiz: Quiz;
  mcqAnswers: Record<string, string>;
  openAnswersText: Record<string, string>;
  pointsEarned: number;
  pointsAutoMax: number;
  passed: boolean;
  bestScore: number;
  attemptsCount: number;
  onRetry: () => void;
  continueHref: string;
}) {
  const score = Math.round((pointsEarned / pointsAutoMax) * 100);
  const totalPossible = totalPossiblePoints(quiz);
  const openQuestions = quiz.questions.filter((q) => !isMultipleChoice(q));

  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center sm:px-10">
        <ThemedAccentBackground wedgeCorner={passed ? "top-right" : "top-left"} />
        <div className="relative mx-auto flex max-w-md flex-col items-center gap-4">
          <div
            className={cn(
              "flex size-16 items-center justify-center rounded-3xl",
              passed ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
            )}
          >
            {passed ? <Check className="size-8" strokeWidth={2.5} /> : <RotateCcw className="size-8" />}
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            {passed ? "כל הכבוד, עברת את המבחן!" : "עוד לא הפעם - אפשר לנסות שוב"}
          </h2>
          <p className="text-slate-500">
            ציון אוטומטי (שאלות אמריקאיות):{" "}
            <span className="font-bold text-slate-900">
              {pointsEarned}/{pointsAutoMax} נקודות ({score}%)
            </span>{" "}
            · נדרש ציון עובר של {quiz.passScore}%
          </p>
          {openQuestions.length > 0 && (
            <p className="rounded-xl bg-amber-50 px-3.5 py-2 text-xs text-amber-700">
              {openQuestions.length} שאלות פתוחות ({openQuestions.reduce((s, q) => s + q.points, 0)} נקודות
              מתוך {totalPossible}) ממתינות להערכה - הציון הסופי עשוי להתעדכן.
            </p>
          )}
          <div className="mt-1 flex items-center gap-6 text-sm text-slate-400">
            <span>ציון גבוה: {Math.max(bestScore, score)}%</span>
            <span>ניסיון מספר {attemptsCount}</span>
          </div>

          {passed ? (
            <Button asChild size="lg" className="mt-2">
              <Link href={continueHref}>
                לצפייה בסיכום הקורס
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
          ) : (
            <Button size="lg" className="mt-2" onClick={onRetry}>
              <RotateCcw className="size-4" />
              לנסות שוב
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
        <h3 className="text-sm font-semibold text-slate-700">סקירת התשובות</h3>
        {quiz.questions.map((q, i) => {
          if (!isMultipleChoice(q)) {
            const text = openAnswersText[q.id]?.trim();
            return (
              <div key={q.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-white">
                    <Clock className="size-3" strokeWidth={3} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800">
                        {i + 1}. {q.question}
                      </p>
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        ממתין להערכה
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-600">
                      {text || "לא נענתה"}
                    </p>
                  </div>
                </div>
              </div>
            );
          }

          const chosenId = mcqAnswers[q.id];
          const isCorrect = chosenId === q.correctOptionId;
          const chosenOption = q.options.find((o) => o.id === chosenId);
          const correctOption = q.options.find((o) => o.id === q.correctOptionId);
          return (
            <div key={q.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="flex items-start gap-2.5">
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-white",
                    isCorrect ? "bg-emerald-500" : "bg-red-400"
                  )}
                >
                  {isCorrect ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" strokeWidth={3} />}
                </span>
                <div className="flex flex-col gap-1.5">
                  <p className="text-sm font-medium text-slate-800">
                    {i + 1}. {q.question}
                  </p>
                  {!isCorrect && (
                    <p className="text-xs text-slate-500">
                      בחרת: <span className="text-red-500">{chosenOption?.text ?? "לא נענתה"}</span> · התשובה
                      הנכונה: <span className="text-emerald-600">{correctOption?.text}</span>
                    </p>
                  )}
                  {q.explanation && <p className="text-xs leading-relaxed text-slate-400">{q.explanation}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
