import { Check } from "lucide-react";
import type { QuizQuestion as QuizQuestionType } from "@/lib/types";
import { cn } from "@/lib/utils";

export function QuizQuestion({
  question,
  selectedOptionId,
  onSelect,
}: {
  question: QuizQuestionType;
  selectedOptionId?: string;
  onSelect: (optionId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-lg font-bold text-slate-900 sm:text-xl">{question.question}</h2>
      <div role="radiogroup" className="flex flex-col gap-2.5">
        {question.options.map((option) => {
          const selected = option.id === selectedOptionId;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(option.id)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-right text-sm transition-all",
                selected
                  ? "border-[var(--course-primary)] bg-[var(--course-soft)] font-medium text-slate-900"
                  : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                  selected ? "border-[var(--course-primary)] bg-[var(--course-primary)] text-white" : "border-slate-300"
                )}
              >
                {selected && <Check className="size-3" strokeWidth={3} />}
              </span>
              {option.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
