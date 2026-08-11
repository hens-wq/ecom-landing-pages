import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";
import { ThemedAccentBackground } from "@/components/shared/GeometricDecor";

export function ComingSoonState({
  icon: Icon,
  title,
  description,
  upcoming,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  upcoming: string[];
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-14 sm:px-14 sm:py-20">
      <ThemedAccentBackground wedgeCorner="top-left" />
      <div className="relative mx-auto flex max-w-xl flex-col items-center gap-5 text-center">
        <div className="flex size-16 items-center justify-center rounded-3xl bg-[var(--course-soft,#f1e9fe)] text-[var(--course-text-accent,var(--brand-purple))]">
          <Icon className="size-8" />
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--course-soft,#f1e9fe)] px-3 py-1 text-xs font-semibold text-[var(--course-text-accent,var(--brand-purple))]">
          <Sparkles className="size-3.5" />
          בקרוב
        </span>
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        <p className="leading-relaxed text-slate-500">{description}</p>

        <div className="mt-4 grid w-full gap-2.5 text-right">
          {upcoming.map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm text-slate-600"
            >
              <span className="size-1.5 shrink-0 rounded-full bg-[var(--course-primary,var(--brand-purple))]" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
