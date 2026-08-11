"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { NavigationItem } from "@/lib/types";
import { useAuth } from "@/lib/hooks/use-auth";
import { useOverallProgress } from "@/lib/hooks/use-overall-progress";
import { FullScreenLoader } from "@/components/shared/FullScreenLoader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";

export function AppShell({
  navigation,
  children,
}: {
  navigation: NavigationItem[];
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { progress } = useOverallProgress(user?.id);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <FullScreenLoader />;
  }

  return (
    <div className="flex min-h-screen bg-white">
      <AppSidebar items={navigation} overallPercent={progress?.percent} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} navigation={navigation} overallPercent={progress?.percent} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
