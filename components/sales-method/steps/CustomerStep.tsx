import type { SalesMethodStep } from "@/lib/content/schemas";
import { TagList } from "@/components/sales-method/parts";

type CustomerStepData = Extract<SalesMethodStep, { kind: "customer" }>;

export function CustomerStep({ step }: { step: CustomerStepData }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">מה מניע אותם</h3>
          <TagList items={step.motivations} tone="emerald" />
        </div>
        <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">ממה הם חוששים</h3>
          <TagList items={step.concerns} tone="amber" />
        </div>
        <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">פרופילים נפוצים</h3>
          <TagList items={step.profiles} />
        </div>
      </div>
      <p className="rounded-xl bg-[var(--brand-purple)]/5 px-4 py-3 text-sm font-medium leading-relaxed text-[var(--brand-purple)]">
        {step.closingLine}
      </p>
    </div>
  );
}
