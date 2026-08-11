import Link from "next/link";
import { Check, Lock, ArrowLeft } from "lucide-react";
import type { TrainingStep, TrainingStepStatus } from "@/lib/types";
import { DEFAULT_ICON, ICON_MAP } from "@/lib/icon-map";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<TrainingStepStatus, string> = {
  completed: "הושלם",
  current: "בתהליך",
  locked: "ננעל",
};

export function StepCircle({
  status,
  icon,
}: {
  status: TrainingStepStatus;
  icon: string;
}) {
  const Icon = ICON_MAP[icon] ?? DEFAULT_ICON;
  return (
    <div
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full ring-4",
        status === "completed" && "bg-[var(--brand-green)] text-white ring-[var(--brand-green)]/15",
        status === "current" && "bg-[var(--brand-purple)] text-white ring-[var(--brand-purple)]/15",
        status === "locked" && "bg-slate-100 text-slate-400 ring-transparent"
      )}
    >
      {status === "completed" ? (
        <Check className="size-5" strokeWidth={3} />
      ) : status === "locked" ? (
        <Lock className="size-4" />
      ) : (
        <Icon className="size-[18px]" />
      )}
    </div>
  );
}

export function TrainingStepCard({
  step,
  status,
  percent,
}: {
  step: TrainingStep;
  status: TrainingStepStatus;
  percent: number;
}) {
  const content = (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-2xl border px-5 py-4 transition-all",
        status === "locked" && "border-slate-100 bg-slate-50/60",
        status === "current" && "border-[var(--brand-purple)]/30 bg-[var(--brand-purple)]/[0.03] shadow-sm",
        status === "completed" && "border-slate-200 bg-white hover:shadow-sm"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className={cn("font-semibold", status === "locked" ? "text-slate-400" : "text-slate-900")}>
            {step.title}
          </h3>
          <p className={cn("text-sm", status === "locked" ? "text-slate-300" : "text-slate-500")}>
            {step.description}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
            status === "completed" && "bg-emerald-50 text-emerald-600",
            status === "current" && "bg-[var(--brand-purple)]/10 text-[var(--brand-purple)]",
            status === "locked" && "bg-slate-100 text-slate-400"
          )}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>

      {status !== "locked" && percent > 0 && percent < 100 && (
        <div className="flex items-center gap-2">
          <Progress value={percent} className="h-1.5 flex-1 bg-slate-100" />
          <span className="text-xs font-medium text-slate-500">{percent}%</span>
        </div>
      )}

      {status === "current" && (
        <span className="mt-1 flex items-center gap-1 text-sm font-semibold text-[var(--brand-purple)]">
          המשך לשלב
          <ArrowLeft className="size-3.5" />
        </span>
      )}
    </div>
  );

  if (status === "locked") {
    return <div aria-disabled>{content}</div>;
  }

  return (
    <Link href={step.href} className="block">
      {content}
    </Link>
  );
}
