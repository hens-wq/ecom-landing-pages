import type { SalesMethodStep } from "@/lib/content/schemas";

type DiagnosticStepData = Extract<SalesMethodStep, { kind: "diagnostic" }>;

export function DiagnosticStep({ step }: { step: DiagnosticStepData }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[var(--brand-purple)]/20 bg-[var(--brand-purple)]/5 p-5 sm:p-7">
      <p className="text-sm font-semibold text-slate-800">{step.exercise}</p>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-purple)]">שאלות אבחון לדוגמה</span>
        <ul className="flex flex-col gap-2">
          {step.sampleQuestions.map((q, i) => (
            <li
              key={i}
              className="flex items-start gap-2.5 rounded-xl border border-white bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-sm"
            >
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--brand-purple)]" />
              {q}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-sm leading-relaxed text-slate-500">{step.toolConnection}</p>
    </div>
  );
}
