"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Quiz } from "@/lib/types";
import { QuizProgress } from "@/components/courses/QuizProgress";
import { QuizQuestion } from "@/components/courses/QuizQuestion";
import { Button } from "@/components/ui/button";

export function QuizEngine({
  quiz,
  onFinish,
}: {
  quiz: Quiz;
  onFinish: (answers: Record<string, string>) => void;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const question = quiz.questions[index];
  const isLast = index === quiz.questions.length - 1;
  const selected = answers[question.id];

  function selectOption(optionId: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: optionId }));
  }

  function handleNext() {
    if (isLast) {
      onFinish(answers);
    } else {
      setIndex((i) => i + 1);
    }
  }

  return (
    <div className="flex flex-col gap-8 rounded-3xl border border-slate-200 bg-white p-6 sm:p-10">
      <QuizProgress current={index + 1} total={quiz.questions.length} />
      <QuizQuestion question={question} selectedOptionId={selected} onSelect={selectOption} />
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          <ArrowRight className="size-4" />
          שאלה קודמת
        </Button>
        <Button disabled={!selected} onClick={handleNext}>
          {isLast ? "סיום המבחן" : "השאלה הבאה"}
          <ArrowLeft className="size-4" />
        </Button>
      </div>
    </div>
  );
}
