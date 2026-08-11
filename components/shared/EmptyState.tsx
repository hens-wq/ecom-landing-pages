import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center",
        className
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--course-soft,#f1f5f9)] text-[var(--course-text-accent,var(--brand-purple))]">
        <Icon className="size-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="max-w-sm text-sm text-slate-500">{description}</p>}
      {action}
    </div>
  );
}
