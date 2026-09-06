import type { SalesMethodStep } from "@/lib/content/schemas";

type TracksOverviewStepData = Extract<SalesMethodStep, { kind: "tracksOverview" }>;

export function TracksOverviewStep({ step }: { step: TracksOverviewStepData }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">מסלול</th>
              <th className="px-4 py-3">למי מתאים</th>
              <th className="px-4 py-3">שכר כניסה</th>
              <th className="px-4 py-3">אחרי ניסיון</th>
              <th className="px-4 py-3">מתקדם</th>
            </tr>
          </thead>
          <tbody>
            {step.tracks.map((t) => (
              <tr key={t.id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-3 font-semibold text-slate-900">{t.name}</td>
                <td className="px-4 py-3 text-slate-500">{t.suits}</td>
                <td className="px-4 py-3 text-slate-600">{t.salary.entry}</td>
                <td className="px-4 py-3 text-slate-600">{t.salary.afterExperience}</td>
                <td className="px-4 py-3 text-slate-600">{t.salary.advanced}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">{step.salaryNote}</p>
    </div>
  );
}
