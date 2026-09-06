import { Quote } from "lucide-react";
import type { SalesMethodStep } from "@/lib/content/schemas";
import { TagList } from "@/components/sales-method/parts";

type TrustStepData = Extract<SalesMethodStep, { kind: "trust" }>;

export function TrustStep({ step }: { step: TrustStepData }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {step.rapportItems.map((item) => (
          <div key={item.label} className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="font-semibold text-slate-900">{item.label}</h3>
            <p className="text-sm leading-relaxed text-slate-500">{item.description}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-900">{step.energyTitle}</h3>
        <p className="text-xs text-slate-500">{step.energyDescription}</p>
        <TagList items={step.energyDimensions} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-[var(--brand-teal)]">{step.warmthLabel}</h3>
          {step.warmthExamples.map((ex, i) => (
            <p key={i} className="flex gap-2 text-sm leading-relaxed text-slate-600">
              <Quote className="size-4 shrink-0 text-slate-300" />
              {ex}
            </p>
          ))}
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-[var(--brand-purple)]">{step.authorityLabel}</h3>
          {step.authorityExamples.map((ex, i) => (
            <p key={i} className="flex gap-2 text-sm leading-relaxed text-slate-600">
              <Quote className="size-4 shrink-0 text-slate-300" />
              {ex}
            </p>
          ))}
        </div>
      </div>

      <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium leading-relaxed text-slate-700">{step.insight}</p>
    </div>
  );
}
