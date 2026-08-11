import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Lightbulb, MessageCircleHeart } from "lucide-react";
import { cn } from "@/lib/utils";

const VARIANTS: Record<"sales-tip" | "customer-explain", { icon: LucideIcon; label: string }> = {
  "sales-tip": { icon: Lightbulb, label: "טיפ לנציג המכירות" },
  "customer-explain": { icon: MessageCircleHeart, label: "איך מסבירים את זה ללקוח?" },
};

export function SalesTipCallout({
  variant,
  title,
  children,
  className,
}: {
  variant: "sales-tip" | "customer-explain";
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const { icon: Icon, label } = VARIANTS[variant];
  return (
    <div
      className={cn(
        "not-prose my-5 flex gap-3 rounded-2xl border border-[var(--course-border)] bg-[var(--course-soft)] px-4 py-4",
        className
      )}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--course-text-accent)]">
        <Icon className="size-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-xs font-semibold text-[var(--course-text-accent)]">{title ?? label}</span>
        <div className="flex flex-col gap-2 text-sm leading-relaxed text-slate-700 [&_p]:m-0">{children}</div>
      </div>
    </div>
  );
}
