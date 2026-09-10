"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Link2, Plug, TrendingUp } from "lucide-react";

import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const NAV_ICONS = {
  "/": BarChart3,
  "/sales-matching": Link2,
  "/integrations": Plug,
} satisfies Record<string, React.ComponentType<{ className?: string }>>;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-l border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-14 items-center gap-2 px-5">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <TrendingUp className="size-4" />
        </span>
        <div className="leading-tight">
          <div className="text-sm font-bold">Ecom</div>
          <div className="text-[11px] text-sidebar-muted">לוח בקרה שיווקי</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = NAV_ICONS[item.href as keyof typeof NAV_ICONS];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                  : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-5 py-3 text-[11px] text-sidebar-muted">
        Phase 1 · נתוני דמו בלבד
      </div>
    </aside>
  );
}
