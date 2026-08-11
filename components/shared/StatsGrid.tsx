import { cn } from "@/lib/utils";

export function StatsGrid({
  stats,
  className,
}: {
  stats: { label: string; value: string }[];
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", className)}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-5 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        >
          <div className="text-2xl font-bold text-slate-900 sm:text-3xl">{stat.value}</div>
          <div className="mt-1 text-xs text-slate-500 sm:text-sm">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
