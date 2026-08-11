import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { NextTask } from "@/lib/next-task";
import { DEFAULT_ICON, ICON_MAP } from "@/lib/icon-map";
import { ProgressRing } from "@/components/shared/ProgressRing";
import { ThemedAccentBackground } from "@/components/shared/GeometricDecor";
import { Button } from "@/components/ui/button";

export function ContinueLearningCard({
  task,
  kicker,
  overallPercent,
}: {
  task: NextTask;
  kicker: string;
  overallPercent: number;
}) {
  const Icon = ICON_MAP[task.icon] ?? DEFAULT_ICON;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
      <ThemedAccentBackground wedgeCorner="top-right" />
      <div className="relative flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-4">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--brand-purple)]/10 px-3 py-1 text-xs font-semibold text-[var(--brand-purple)]">
            {kicker}
          </span>
          <div className="flex items-center gap-3.5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-purple)]/10 text-[var(--brand-purple)]">
              <Icon className="size-6" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{task.title}</h2>
              <p className="text-sm text-slate-500">{task.description}</p>
            </div>
          </div>
          <Button asChild size="lg" className="w-fit">
            <Link href={task.href}>
              {task.ctaLabel}
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="shrink-0 self-center">
          <ProgressRing percent={overallPercent} label="מההכשרה" />
        </div>
      </div>
    </div>
  );
}
