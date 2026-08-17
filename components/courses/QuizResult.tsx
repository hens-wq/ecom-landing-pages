import Link from "next/link";
import { ArrowLeft, Check, Clock, RotateCcw, X } from "lucide-react";
import type { Quiz, QuizEvaluationStatus, QuizOpenAnswerRecord } from "@/lib/types";
import { isMultipleChoice } from "@/lib/quiz";
import { ThemedAccentBackground } from "@/components/shared/GeometricDecor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function QuizResult({
  quiz,
  mcqAnswers,
  openAnswers,
  pointsEarned,
  pointsAutoMax,
  pointsTotalPossible,
  evaluationStatus,
  score,
  passed,
  bestScore,
  attemptsCount,
  onRetry,
  continueHref,
}: {
  quiz: Quiz;
  mcqAnswers: Record<string, string>;
  openAnswers: QuizOpenAnswerRecord[];
  /** Points earned on the auto-graded MCQ portion only (out of pointsAutoMax). */
  pointsEarned: number;
  pointsAutoMax: number;
  pointsTotalPossible: number;
  evaluationStatus: QuizEvaluationStatus;
  /** Final percentage out of 100 — only set once evaluationStatus is "graded". */
  score: number | null;
  /** Pass/fail against quiz.passScore — only set once evaluationStatus is "graded". */
  passed: boolean | null;
  bestScore: number;
  attemptsCount: number;
  onRetry: () => void;
  continueHref: string;
}) {
  const pending = evaluationStatus !== "graded";
  const openPointsPossible = openAnswers.reduce((sum, a) => sum + a.points, 0);
  const pendingCount = openAnswers.filter((a) => a.status === "pending").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-10 text-center sm:px-10">
        <ThemedAccentBackground wedgeCorner={pending || passed ? "top-right" : "top-left"} />
        <div className="relative mx-auto flex max-w-md flex-col items-center gap-4">
          <div
            className={cn(
              "flex size-16 items-center justify-center rounded-3xl",
              pending
                ? "bg-slate-100 text-slate-500"
                : passed
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-amber-50 text-amber-600"
            )}
          >
            {pending ? (
              <Clock className="size-8" />
            ) : passed ? (
              <Check className="size-8" strokeWidth={2.5} />
            ) : (
              <RotateCcw className="size-8" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            {pending
              ? "המבחן נשלח לבדיקה"
              : passed
                ? "כל הכבוד, עברת את המבחן!"
                : "עוד לא הפעם - אפשר לנסות שוב"}
          </h2>

          {pending ? (
            <>
              <p className="text-slate-500">
                ציון ביניים (שאלות אמריקאיות):{" "}
                <span className="font-bold text-slate-900">
                  {pointsEarned} מתוך {pointsAutoMax} נקודות
                </span>
              </p>
              <p className="rounded-xl bg-amber-50 px-3.5 py-2 text-xs text-amber-700">
                {pendingCount} שאלות פתוחות ממתינות להערכה - {openPointsPossible} נקודות נוספות
                (מתוך {pointsTotalPossible} סה&quot;כ). הציון הסופי ותוצאת עובר/לא עובר יופיעו רק
                לאחר שהשאלות הפתוחות יוערכו.
              </p>
            </>
          ) : (
            <p className="text-slate-500">
              ציון סופי:{" "}
              <span className="font-bold text-slate-900">
                {score}% ({pointsTotalPossible} נקודות סה&quot;כ)
              </span>{" "}
              · נדרש ציון עובר של {quiz.passScore}%
            </p>
          )}

          <div className="mt-1 flex items-center gap-6 text-sm text-slate-400">
            <span>{bestScore > 0 ? `ציון סופי גבוה: ${bestScore}%` : "טרם נקבע ציון סופי"}</span>
            <span>ניסיון מספר {attemptsCount}</span>
          </div>

          {pending ? (
            <Button size="lg" variant="outline" className="mt-2" onClick={onRetry}>
              <RotateCcw className="size-4" />
              ניסיון נוסף
            </Button>
          ) : passed ? (
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
            const record = openAnswers.find((a) => a.questionId === q.id);
            const text = record?.answerText.trim();
            const graded = record?.status === "graded";
            return (
              <div key={q.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-white",
                      graded ? "bg-emerald-500" : "bg-amber-400"
                    )}
                  >
                    {graded ? (
                      <Check className="size-3" strokeWidth={3} />
                    ) : (
                      <Clock className="size-3" strokeWidth={3} />
                    )}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800">
                        {i + 1}. {q.question}
                      </p>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          graded ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        )}
                      >
                        {graded ? `${record?.score ?? 0}/${record?.points} נקודות` : "ממתין להערכה"}
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
