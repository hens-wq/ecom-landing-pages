import type { LucideIcon } from "lucide-react";
import { Lightbulb, MessageCircleHeart } from "lucide-react";
import { cn } from "@/lib/utils";

const VARIANTS: Record<"sales-tip" | "customer-explain", { icon: LucideIcon; label: string }> = {
  "sales-tip": { icon: Lightbulb, label: "טיפ למכירה" },
  "customer-explain": { icon: MessageCircleHeart, label: "איך מסבירים ללקוח" },
};

export function SalesTipCallout({
  variant,
  children,
  className,
}: {
  variant: "sales-tip" | "customer-explain";
  children: string;
  className?: string;
}) {
  const { icon: Icon, label } = VARIANTS[variant];
  return (
    <div
      className={cn(
        "flex gap-3 rounded-2xl border border-[var(--course-border)] bg-[var(--course-soft)] px-4 py-4",
        className
      )}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--course-text-accent)]">
        <Icon className="size-4" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-[var(--course-text-accent)]">{label}</span>
        <p className="text-sm leading-relaxed text-slate-700">{children}</p>
      </div>
    </div>
  );
}
