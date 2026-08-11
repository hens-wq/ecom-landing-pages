import Link from "next/link";
import { Check } from "lucide-react";
import type { Topic } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TopicNavigator({
  courseSlug,
  topics,
  currentIndex,
  completedTopicIds,
}: {
  courseSlug: string;
  topics: Topic[];
  currentIndex: number;
  completedTopicIds: string[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {topics.map((topic) => {
        const isCurrent = topic.index === currentIndex;
        const isDone = completedTopicIds.includes(topic.id);
        return (
          <Link
            key={topic.id}
            href={`/courses/${courseSlug}/playbook/${topic.index}`}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors",
              isCurrent
                ? "bg-[var(--course-soft)] font-semibold text-[var(--course-text-accent)]"
                : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                isDone
                  ? "bg-[var(--course-primary)] text-white"
                  : isCurrent
                    ? "border-2 border-[var(--course-primary)] text-[var(--course-text-accent)]"
                    : "border border-slate-300 text-slate-400"
              )}
            >
              {isDone ? <Check className="size-3.5" strokeWidth={3} /> : topic.index}
            </span>
            {topic.title}
          </Link>
        );
      })}
    </div>
  );
}
