import { cn } from "@/lib/utils";

/**
 * Small shared presentational pieces reused across Sales Method steps.
 * Kept dumb/stateless on purpose - each step component decides layout,
 * these just render one recurring visual pattern consistently.
 */

export function TagList({ items, tone = "slate" }: { items: string[]; tone?: "slate" | "amber" | "emerald" }) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-50 text-slate-600";
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span key={i} className={cn("rounded-full border px-3 py-1.5 text-xs font-medium", toneClass)}>
          {item}
        </span>
      ))}
    </div>
  );
}

export function NumberedCard({
  number,
  title,
  description,
  size = "md",
}: {
  number: string;
  title: string;
  description: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white",
        size === "sm" ? "p-4" : "gap-2.5 p-5"
      )}
    >
      <span className={cn("font-extrabold text-[var(--brand-purple)]/30", size === "sm" ? "text-lg" : "text-2xl")}>
        {number}
      </span>
      <h3 className={cn("font-semibold text-slate-900", size === "sm" ? "text-sm" : "text-base")}>{title}</h3>
      <p className={cn("leading-relaxed text-slate-500", size === "sm" ? "text-xs" : "text-sm")}>{description}</p>
    </div>
  );
}
