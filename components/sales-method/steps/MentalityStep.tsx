import { Quote, Sparkles } from "lucide-react";
import type { SalesMethodStep } from "@/lib/content/schemas";
import { NumberedCard } from "@/components/sales-method/parts";

type MentalityStepData = Extract<SalesMethodStep, { kind: "mentality" }>;

export function MentalityStep({ step }: { step: MentalityStepData }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {step.items.map((item) => (
          <NumberedCard key={item.number} number={item.number} title={item.title} description={item.description} size="sm" />
        ))}
      </div>

      <p className="flex gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
        <Quote className="size-4 shrink-0 text-slate-300" />
        {step.personalStory}
      </p>
      <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-700">{step.objectionsNote}</p>

      <div className="flex flex-col gap-4 border-t border-slate-100 pt-6">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-lg font-bold text-slate-900">{step.summaryTitle}</h2>
          <p className="text-sm leading-relaxed text-slate-500">{step.summaryDescription}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-5">
          {step.summaryPhases.map((phase) => (
            <div key={phase.number} className="flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white p-4">
              <span className="flex size-7 items-center justify-center rounded-full bg-[var(--brand-purple)]/10 text-xs font-bold text-[var(--brand-purple)]">
                {phase.number}
              </span>
              <h3 className="text-sm font-semibold text-slate-900">{phase.title}</h3>
              <p className="text-xs leading-relaxed text-slate-500">{phase.description}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5 rounded-2xl border border-[var(--brand-teal)]/25 bg-[var(--brand-teal)]/5 px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Sparkles className="size-4 text-[var(--brand-teal)]" />
            {step.throughoutTitle}
          </h3>
          <p className="text-sm leading-relaxed text-slate-600">{step.throughoutDescription}</p>
        </div>
      </div>
    </div>
  );
}
