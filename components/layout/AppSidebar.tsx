"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap } from "lucide-react";
import type { NavigationItem } from "@/lib/types";
import { DEFAULT_ICON, ICON_MAP } from "@/lib/icon-map";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ items, pathname, onNavigate }: { items: NavigationItem[]; pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = ICON_MAP[item.icon] ?? DEFAULT_ICON;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-[var(--brand-purple)]/10 text-[var(--brand-purple)]"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <Icon className={cn("size-[18px] shrink-0", active ? "text-[var(--brand-purple)]" : "text-slate-400 group-hover:text-slate-600")} />
            <span className="flex-1">{item.label}</span>
            {item.comingSoon && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                בקרוב
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function SidebarBrand() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--brand-purple)] to-[var(--brand-teal)] text-white shadow-sm">
        <GraduationCap className="size-5" />
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-bold text-slate-900">מערכת הכשרת מכירות</span>
        <span className="text-[11px] text-slate-400">מכללת Ecom</span>
      </div>
    </div>
  );
}

export function AppSidebar({
  items,
  overallPercent,
}: {
  items: NavigationItem[];
  overallPercent?: number;
}) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col gap-6 border-l border-slate-200 bg-white px-4 py-6 lg:flex">
      <SidebarBrand />
      <div className="flex-1 overflow-y-auto">
        <NavLinks items={items} pathname={pathname} />
      </div>
      {typeof overallPercent === "number" && (
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-600">ההתקדמות שלי</span>
            <span className="font-semibold text-slate-900">{overallPercent}%</span>
          </div>
          <Progress value={overallPercent} className="h-1.5 bg-slate-200" />
        </div>
      )}
    </aside>
  );
}

export { NavLinks };
