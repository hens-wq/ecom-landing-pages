import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requirePageSession } from "@/lib/auth/session";

// Every dashboard page gets the sidebar and topbar from here. Pages outside this
// group (such as /creative/[adId]) render without them. Route groups don't appear
// in URLs, so the dashboard addresses stay the same.
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // The proxy already sends visitors without a session to the sign-in page. This second check runs on the server, so the
  // dashboard never renders for a request that lacks a valid session.
  await requirePageSession();
  return <AppShell>{children}</AppShell>;
}
