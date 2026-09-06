import type { SalesMethodStep } from "@/lib/content/schemas";

type MatchingStepData = Extract<SalesMethodStep, { kind: "matching" }>;

export function MatchingStep({ step }: { step: MatchingStepData }) {
  const columnLabel = (c: "dynamic" | "technical") =>
    c === "dynamic" ? step.axisXLabels.dynamic : step.axisXLabels.technical;
  const rowLabel = (r: "hasEnglish" | "noEnglish") =>
    r === "hasEnglish" ? step.axisYLabels.hasEnglish : step.axisYLabels.noEnglish;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <p className="text-xs font-medium text-slate-400">
        ציר אופקי: {step.axisXLabels.dynamic} ↔ {step.axisXLabels.technical} · ציר אנכי: {step.axisYLabels.hasEnglish} ↔{" "}
        {step.axisYLabels.noEnglish}
      </p>
      <div className="relative grid grid-cols-2 gap-3">
        {step.quadrants.map((q) => (
          <div
            key={q.id}
            className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-8 text-center sm:py-10"
          >
            <span className="text-lg font-bold text-slate-900 sm:text-xl">{q.trackName}</span>
            <span className="text-[11px] font-medium text-slate-400">
              {columnLabel(q.column)} · {rowLabel(q.row)}
            </span>
          </div>
        ))}
        <div className="pointer-events-none absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[var(--brand-purple)] bg-white shadow-lg sm:size-20">
          <span className="text-sm font-extrabold text-[var(--brand-purple)] sm:text-base">{step.centerLabel}</span>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-slate-400">{step.centerNote}</p>
    </div>
  );
}
