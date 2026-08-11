import { cn } from "@/lib/utils";

export function ProgressRing({
  percent,
  size = 96,
  strokeWidth = 8,
  className,
  label,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--course-soft, #f1f5f9)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--course-primary, var(--brand-purple))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-slate-900">{clamped}%</span>
        {label && <span className="text-[11px] text-slate-500">{label}</span>}
      </div>
    </div>
  );
}
