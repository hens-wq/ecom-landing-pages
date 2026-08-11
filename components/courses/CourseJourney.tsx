import Link from "next/link";
import { BookOpen, Check, Lock, PlayCircle, ClipboardCheck, ArrowLeft } from "lucide-react";
import type { JourneyItem } from "@/lib/course-journey";
import { cn } from "@/lib/utils";

const TYPE_ICON = {
  topic: BookOpen,
  video: PlayCircle,
  quiz: ClipboardCheck,
};

export function CourseJourney({ items }: { items: JourneyItem[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item) => {
        const TypeIcon = TYPE_ICON[item.type];
        const isLocked = item.status === "locked";
        const isCompleted = item.status === "completed";

        const inner = (
          <div
            className={cn(
              "flex items-center gap-3.5 rounded-2xl border px-4 py-3.5 transition-all",
              isLocked && "border-slate-100 bg-slate-50/60",
              item.status === "current" &&
                "border-[var(--course-primary)]/30 bg-[var(--course-soft)]/50 shadow-sm",
              isCompleted && "border-slate-200 bg-white hover:shadow-sm"
            )}
          >
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl",
                isCompleted && "bg-[var(--course-primary)] text-white",
                item.status === "current" && "bg-[var(--course-soft)] text-[var(--course-text-accent)]",
                isLocked && "bg-slate-100 text-slate-400"
              )}
            >
              {isCompleted ? (
                <Check className="size-4" strokeWidth={3} />
              ) : isLocked ? (
                <Lock className="size-4" />
              ) : (
                <TypeIcon className="size-[18px]" />
              )}
            </div>
            <span className={cn("flex-1 text-sm font-medium", isLocked ? "text-slate-400" : "text-slate-800")}>
              {item.title}
            </span>
            {item.status === "current" && <ArrowLeft className="size-4 shrink-0 text-[var(--course-text-accent)]" />}
          </div>
        );

        if (isLocked) {
          return <div key={item.id}>{inner}</div>;
        }
        return (
          <Link key={item.id} href={item.href}>
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
