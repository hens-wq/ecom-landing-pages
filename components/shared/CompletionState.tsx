import type { ReactNode } from "react";
import { PartyPopper } from "lucide-react";
import { ThemedAccentBackground } from "@/components/shared/GeometricDecor";

export function CompletionState({
  title,
  description,
  stats,
  action,
}: {
  title: string;
  description: string;
  stats?: { label: string; value: string }[];
  action?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-14 sm:px-14 sm:py-16">
      <ThemedAccentBackground wedgeCorner="top-right" />
      <div className="relative mx-auto flex max-w-xl flex-col items-center gap-5 text-center">
        <div className="flex size-16 items-center justify-center rounded-3xl bg-[var(--course-soft,#f1e9fe)] text-[var(--course-text-accent,var(--brand-purple))]">
          <PartyPopper className="size-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h2>
        <p className="leading-relaxed text-slate-500">{description}</p>

        {stats && stats.length > 0 && (
          <div className="mt-2 grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-[var(--course-border,#e2e8f0)] bg-[var(--course-soft,#f8fafc)] px-4 py-4"
              >
                <div className="text-xl font-bold text-[var(--course-text-accent,var(--brand-purple))]">
                  {stat.value}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}
