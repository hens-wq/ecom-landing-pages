import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { getNavigation } from "@/lib/content/loader";

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  const navigation = getNavigation();
  return <AppShell navigation={navigation}>{children}</AppShell>;
}
