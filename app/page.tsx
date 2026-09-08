import { redirect } from "next/navigation";
import type { Metadata } from "next";
import BrandCyberPage from "./lp/brand/cyber/page";

// This project ships campaign landing pages only (no marketing homepage yet).
// Paid traffic always lands directly on a /lp/... URL; this route exists so
// "/" doesn't 404 while the site has a single page.
//
// Static export (STATIC_EXPORT=1, see next.config.ts / scripts/build-static.sh)
// has no server to run a redirect on request, and a static <meta refresh>
// stub would mean every visitor's first paint is a blank redirect page —
// so that build renders the Cyber page directly at "/" instead. The normal
// Node.js/Vercel build is unchanged: "/" keeps redirecting, as before.
const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

// Matches app/lp/brand/cyber/page.tsx's own metadata exactly (title +
// the root layout's " | מכללת איקום" template suffix) — written out here
// rather than imported, since Next's title-template composition is
// resolved per source file location, not per JS value.
export const metadata: Metadata = isStaticExport
  ? {
      title: "קורס סייבר ב-10 חודשים | מכללת איקום",
      description: "קורס סייבר ב-10 חודשים, ללא צורך ברקע קודם. בדיקת התאמה קצרה וללא עלות.",
    }
  : {};

export default function RootPage() {
  if (isStaticExport) {
    return <BrandCyberPage />;
  }
  redirect("/lp/brand/cyber");
}
