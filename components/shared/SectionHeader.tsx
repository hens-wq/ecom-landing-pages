import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionHeader({
  kicker,
  title,
  description,
  action,
  className,
}: {
  kicker?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="flex flex-col gap-1.5">
        {kicker && (
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--course-text-accent,var(--brand-purple))]">
            {kicker}
          </span>
        )}
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h2>
        {description && <p className="max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
