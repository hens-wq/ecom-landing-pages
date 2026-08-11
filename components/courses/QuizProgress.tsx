import { Progress } from "@/components/ui/progress";

export function QuizProgress({ current, total }: { current: number; total: number }) {
  const percent = Math.round((current / total) * 100);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-600">
          שאלה {current} מתוך {total}
        </span>
        <span className="font-semibold text-[var(--course-text-accent)]">{percent}%</span>
      </div>
      <Progress value={percent} className="h-1.5 bg-slate-100" />
    </div>
  );
}
