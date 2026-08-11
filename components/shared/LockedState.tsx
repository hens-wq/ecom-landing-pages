import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export function LockedState({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-400",
        className
      )}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-slate-200">
        <Lock className="size-4" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        {description && <span className="text-xs text-slate-400">{description}</span>}
      </div>
    </div>
  );
}
