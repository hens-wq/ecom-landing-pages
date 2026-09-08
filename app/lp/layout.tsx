import type { ReactNode } from "react";
import Script from "next/script";
import { AnalyticsScripts } from "@/components/layout/AnalyticsScripts";

/**
 * Shared shell for every /lp/* campaign page. Analytics tags are injected
 * once here so each landing page only has to focus on its own content.
 *
 * Planned routes under this group (see project README for status):
 *   /lp/brand/cyber            <- built
 *   /lp/brand/ai               <- built
 *   /lp/brand/digital-marketing  not yet built
 *   /lp/brand/hightech            not yet built
 *   /lp/general/cyber             not yet built
 *   /lp/general/ai                not yet built
 *   /lp/general/hightech          not yet built
 */
export default function LandingPagesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {process.env.NEXT_PUBLIC_STATIC_EXPORT === "1" ? (
        // next/script's beforeInteractive strategy does not apply
        // basePath prefixing the way regular asset URLs do — prefix by
        // hand (empty in the normal build, where this block never renders).
        <Script
          src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/lead-config.js`}
          strategy="beforeInteractive"
        />
      ) : null}
      {children}
      <AnalyticsScripts />
    </>
  );
}
