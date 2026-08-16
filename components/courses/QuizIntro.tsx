import { ClipboardList, Info, Sparkles } from "lucide-react";
import type { Quiz } from "@/lib/types";
import { isMultipleChoice, isOpenText, totalPossiblePoints } from "@/lib/quiz";
import { ThemedAccentBackground } from "@/components/shared/GeometricDecor";
import { Button } from "@/components/ui/button";

export function QuizIntro({
  quiz,
  courseName,
  resuming,
  onStart,
}: {
  quiz: Quiz;
  courseName: string;
  resuming: boolean;
  onStart: () => void;
}) {
  const mcqQuestions = quiz.questions.filter(isMultipleChoice);
  const openQuestions = quiz.questions.filter(isOpenText);
  const mcqPointsEach = mcqQuestions[0]?.points ?? 0;
  const openPointsEach = openQuestions[0]?.points ?? 0;
  const total = totalPossiblePoints(quiz);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-10 sm:px-10">
      <ThemedAccentBackground wedgeCorner="top-right" />
      <div className="relative mx-auto flex max-w-xl flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--course-soft)] text-[var(--course-text-accent)]">
            <ClipboardList className="size-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{quiz.intro.title}</h1>
        </div>

        <div className="flex flex-col gap-3 text-sm leading-relaxed text-slate-600">
          {quiz.intro.description.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-[var(--course-border)] bg-[var(--course-soft)] p-5">
          <h3 className="text-sm font-semibold text-[var(--course-text-accent)]">מבנה המבחן</h3>
          <ul className="flex flex-col gap-1.5 text-sm text-slate-700">
            <li>
              {mcqQuestions.length} שאלות אמריקאיות - {mcqPointsEach} נקודות לכל שאלה
            </li>
            <li>
              {openQuestions.length} שאלות פתוחות - {openPointsEach} נקודות לכל שאלה
            </li>
            <li className="font-semibold">סה&quot;כ - {total} נקודות</li>
          </ul>
        </div>

        <p className="text-sm text-slate-500">{quiz.intro.reminder}</p>

        <div className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <Info className="size-5 shrink-0 text-slate-400" />
          <p className="text-sm leading-relaxed text-slate-600">{quiz.intro.materialsNote}</p>
        </div>

        <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Sparkles className="size-4 text-[var(--course-primary)]" />
          {quiz.intro.goodLuck}
        </p>

        <Button size="lg" onClick={onStart} className="mt-1 w-fit">
          {resuming ? `המשך במבחן ${courseName}` : `מתחילים את מבחן ${courseName}`}
        </Button>
      </div>
    </div>
  );
}
