import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="ניווט" className="flex items-center gap-1.5 text-sm text-slate-400">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {item.href && !isLast ? (
              <Link href={item.href} className="transition-colors hover:text-slate-700">
                {item.label}
              </Link>
            ) : (
              <span className={cn(isLast && "font-medium text-slate-700")}>{item.label}</span>
            )}
            {!isLast && <ChevronLeft className="size-3.5" />}
          </span>
        );
      })}
    </nav>
  );
}

export function PageHeader({
  crumbs,
  title,
  description,
  action,
  className,
}: {
  crumbs?: Crumb[];
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {crumbs && <Breadcrumbs items={crumbs} />}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
          {description && <p className="max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
