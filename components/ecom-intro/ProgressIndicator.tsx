"use client";

import { cn } from "@/lib/utils";

export function ProgressIndicator({
  current,
  total,
  className,
}: {
  current: number;
  total: number;
  className?: string;
}) {
  const percent = Math.round(((current + 1) / total) * 100);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="whitespace-nowrap text-xs font-medium text-slate-400">
        {current + 1} מתוך {total}
      </span>
      <div className="flex h-1 w-28 overflow-hidden rounded-full bg-slate-200 sm:w-40">
        <div
          className="h-full rounded-full bg-[var(--brand-purple)] transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
