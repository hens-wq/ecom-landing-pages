import { ListChecks } from "lucide-react";
import type { OpenTextQuestion as OpenTextQuestionType } from "@/lib/types";

export function OpenTextQuestion({
  question,
  value,
  onChange,
}: {
  question: OpenTextQuestionType;
  value: string;
  onChange: (text: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold leading-relaxed text-slate-900 sm:text-xl">
          {question.scenario}
        </h2>
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--course-border)] bg-[var(--course-soft)]/50 p-4 sm:p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--course-text-accent)]">
            <ListChecks className="size-4 shrink-0" />
            {question.promptIntro}
          </p>
          <ul className="flex flex-col gap-2.5">
            {question.topics.map((topic, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-700">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--course-primary)]" />
                <span>{topic}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <textarea
        dir="rtl"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="כתבו כאן את התשובה שלכם..."
        rows={8}
        className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm leading-relaxed text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus-visible:border-[var(--course-primary)] focus-visible:ring-2 focus-visible:ring-[var(--course-primary)]"
      />
      <p className="text-xs text-slate-400">
        התשובה נשמרת אוטומטית תוך כדי כתיבה - אפשר לצאת ולחזור בלי לאבד אותה.
      </p>
    </div>
  );
}
