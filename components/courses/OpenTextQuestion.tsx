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
      <h2 className="text-lg font-bold leading-relaxed text-slate-900 sm:text-xl">
        {question.question}
      </h2>
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
