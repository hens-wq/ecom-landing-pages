"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrendingUp } from "lucide-react";

import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const PAGE_TITLES: Record<string, { he: string; en: string }> = {
  "/": { he: "דשבורד", en: "Dashboard" },
  "/sales-matching": { he: "מכירות והתאמות", en: "Sales & Matching" },
  "/integrations": { he: "חיבורים", en: "Integrations" },
};

export function Topbar() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? PAGE_TITLES["/"];

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-2 lg:hidden">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <TrendingUp className="size-4" />
          </span>
          <span className="text-sm font-bold">Ecom</span>
        </div>
        <div className="hidden flex-col lg:flex">
          <h1 className="text-sm font-semibold text-foreground">
            {title.he} <span className="text-xs font-normal text-muted-foreground">({title.en})</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">מנכ״ל שיווק</span>
          <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
            ה
          </span>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-t border-border px-3 py-1.5 lg:hidden">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                isActive ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-secondary/60"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
