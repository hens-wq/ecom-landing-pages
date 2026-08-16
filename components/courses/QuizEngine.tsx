"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import type { QuizDraft, Quiz } from "@/lib/types";
import { isMultipleChoice, questionPointsLabel } from "@/lib/quiz";
import { QuizProgress } from "@/components/courses/QuizProgress";
import { QuizQuestion } from "@/components/courses/QuizQuestion";
import { OpenTextQuestion } from "@/components/courses/OpenTextQuestion";
import { Button } from "@/components/ui/button";

export interface QuizEngineResult {
  mcqAnswers: Record<string, string>;
  openAnswers: Record<string, string>;
}

export function QuizEngine({
  quiz,
  initialDraft,
  closingNote,
  onDraftChange,
  onFinish,
}: {
  quiz: Quiz;
  initialDraft?: Pick<QuizDraft, "currentIndex" | "mcqAnswers" | "openAnswers"> | null;
  closingNote?: string;
  onDraftChange: (draft: QuizEngineResult & { currentIndex: number }) => void;
  onFinish: (result: QuizEngineResult) => void;
}) {
  const [index, setIndex] = useState(initialDraft?.currentIndex ?? 0);
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>(
    initialDraft?.mcqAnswers ?? {}
  );
  const [openAnswers, setOpenAnswers] = useState<Record<string, string>>(
    initialDraft?.openAnswers ?? {}
  );

  useEffect(() => {
    onDraftChange({ currentIndex: index, mcqAnswers, openAnswers });
    // onDraftChange is a stable persistence callback from the parent; only
    // re-run when the answers/index actually change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, mcqAnswers, openAnswers]);

  const question = quiz.questions[index];
  const isLast = index === quiz.questions.length - 1;
  const hasAnswer = isMultipleChoice(question)
    ? Boolean(mcqAnswers[question.id])
    : Boolean(openAnswers[question.id]?.trim());

  function selectOption(optionId: string) {
    setMcqAnswers((prev) => ({ ...prev, [question.id]: optionId }));
  }

  function changeOpenText(text: string) {
    setOpenAnswers((prev) => ({ ...prev, [question.id]: text }));
  }

  function handleNext() {
    if (isLast) {
      onFinish({ mcqAnswers, openAnswers });
    } else {
      setIndex((i) => i + 1);
    }
  }

  return (
    <div className="flex flex-col gap-8 rounded-3xl border border-slate-200 bg-white p-6 sm:p-10">
      <QuizProgress current={index + 1} total={quiz.questions.length} />

      <div className="flex flex-col gap-3">
        <span className="w-fit rounded-full bg-[var(--course-soft)] px-3 py-1 text-xs font-semibold text-[var(--course-text-accent)]">
          שאלה {index + 1} - {questionPointsLabel(question)}
        </span>

        {isMultipleChoice(question) ? (
          <QuizQuestion question={question} selectedOptionId={mcqAnswers[question.id]} onSelect={selectOption} />
        ) : (
          <OpenTextQuestion
            question={question}
            value={openAnswers[question.id] ?? ""}
            onChange={changeOpenText}
          />
        )}
      </div>

      {isLast && closingNote && (
        <div className="flex gap-3 rounded-2xl border border-[var(--course-border)] bg-[var(--course-soft)] p-4">
          <CheckCircle2 className="size-5 shrink-0 text-[var(--course-text-accent)]" />
          <p className="text-sm leading-relaxed text-slate-700">{closingNote}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          <ArrowRight className="size-4" />
          שאלה קודמת
        </Button>
        <Button disabled={!hasAnswer} onClick={handleNext}>
          {isLast ? "סיום המבחן" : "השאלה הבאה"}
          <ArrowLeft className="size-4" />
        </Button>
      </div>
    </div>
  );
}
