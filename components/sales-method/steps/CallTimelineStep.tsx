import type { SalesMethodStep } from "@/lib/content/schemas";

type CallTimelineStepData = Extract<SalesMethodStep, { kind: "callTimeline" }>;

export function CallTimelineStep({ step }: { step: CallTimelineStepData }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="relative flex flex-col rounded-2xl border border-slate-200 bg-white px-4 py-2 sm:px-6">
        <div className="pointer-events-none absolute right-[35px] top-6 bottom-6 w-px bg-slate-200 sm:right-[47px]" />
        {step.steps.map((s) => (
          <div key={s.number} className="relative flex items-center gap-4 py-2.5">
            <span className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-[var(--brand-purple)] bg-white text-xs font-bold text-[var(--brand-purple)] sm:size-11 sm:text-sm">
              {s.number}
            </span>
            <span className="text-sm font-medium text-slate-700 sm:text-base">{s.title}</span>
          </div>
        ))}
      </div>
      <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-700">{step.sideNote}</p>
    </div>
  );
}
