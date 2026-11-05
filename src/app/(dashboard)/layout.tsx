import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requirePrivatePage } from "@/lib/auth/guards";

// Every dashboard page gets the sidebar and topbar from here. Pages outside this
// group (such as /creative/[adId]) render without them. Route groups don't appear
// in URLs, so the dashboard addresses stay the same.
//
// The private area is decided per request (lib/auth/mode.ts). A static render would keep the answer of the build, so this
// group is always rendered on the server for each request.
export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  // The proxy already answers 404 for these pages where the private area is closed. This second check runs on the server,
  // so the dashboard never renders on a deployment where it does not exist.
  requirePrivatePage();
  return <AppShell>{children}</AppShell>;
}
