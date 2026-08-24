import type { ReactNode } from "react";
import { AnalyticsScripts } from "@/components/layout/AnalyticsScripts";

/**
 * Shared shell for every /lp/* campaign page. Analytics tags are injected
 * once here so each landing page only has to focus on its own content.
 *
 * Planned routes under this group (see project README for status):
 *   /lp/brand/cyber            <- built
 *   /lp/brand/ai                 not yet built
 *   /lp/brand/digital-marketing  not yet built
 *   /lp/brand/hightech            not yet built
 *   /lp/general/cyber             not yet built
 *   /lp/general/ai                not yet built
 *   /lp/general/hightech          not yet built
 */
export default function LandingPagesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <AnalyticsScripts />
    </>
  );
}
