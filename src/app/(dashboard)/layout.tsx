import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";

// Every dashboard page gets the sidebar and topbar from here. Pages outside this
// group (such as /creative/[adId]) render without them. Route groups don't appear
// in URLs, so the dashboard addresses stay the same.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
