"use client";

import Link from "next/link";
import { Bell, LogOut, Settings } from "lucide-react";
import type { NavigationItem, User } from "@/lib/types";
import { authRepository } from "@/lib/repositories/auth.repository";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MobileNav } from "@/components/layout/MobileNav";
import { useRouter } from "next/navigation";

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("");
}

export function Topbar({
  user,
  navigation,
  overallPercent,
}: {
  user: User;
  navigation: NavigationItem[];
  overallPercent?: number;
}) {
  const router = useRouter();

  async function handleLogout() {
    await authRepository.logout();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-2">
        <MobileNav items={navigation} />
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {typeof overallPercent === "number" && (
          <div className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 sm:flex">
            <span className="size-1.5 rounded-full bg-[var(--brand-green)]" />
            {overallPercent}% מההכשרה הושלמה
          </div>
        )}

        <Button variant="ghost" size="icon" className="text-slate-400" aria-label="התראות">
          <Bell className="size-[18px]" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-slate-100 sm:pl-3">
              <span className="hidden flex-col items-end leading-tight sm:flex">
                <span className="text-sm font-semibold text-slate-900">{user.name}</span>
                <span className="text-xs text-slate-400">{user.role}</span>
              </span>
              <Avatar className="size-9">
                <AvatarFallback>{initials(user.name)}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <Settings className="size-4" />
                פרופיל / הגדרות
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 data-[highlighted]:bg-red-50 data-[highlighted]:text-red-700">
              <LogOut className="size-4" />
              התנתקות
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
