import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Script from "next/script";
import { AnalyticsScripts } from "@/components/layout/AnalyticsScripts";
import BrandCyberPage from "./lp/brand/cyber/page";
import BrandAiPage from "./lp/brand/ai/page";

// This project ships campaign landing pages only (no marketing homepage yet).
// Paid traffic always lands directly on a /lp/... URL; this route exists so
// "/" doesn't 404 while the site has a single page.
//
// Static export (STATIC_EXPORT=1, see next.config.ts / scripts/build-static.sh
// and scripts/build-static-ai.sh) has no server to run a redirect on
// request, and a static <meta refresh> stub would mean every visitor's
// first paint is a blank redirect page — so that build renders the target
// campaign page directly at "/" instead, picked via NEXT_PUBLIC_STATIC_PAGE
// ("cyber" or "ai", see next.config.ts). The normal Node.js/Vercel build is
// unchanged: "/" keeps redirecting, as before.
const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";
const staticPage = process.env.NEXT_PUBLIC_STATIC_PAGE === "ai" ? "ai" : "cyber";

// Matches the target page's own metadata exactly (title + the root
// layout's " | מכללת איקום" template suffix) — written out here rather
// than imported, since Next's title-template composition is resolved per
// source file location, not per JS value.
const STATIC_METADATA: Record<"cyber" | "ai", Metadata> = {
  cyber: {
    title: "קורס סייבר ב-10 חודשים | מכללת איקום",
    description: "קורס סייבר ב-10 חודשים, ללא צורך ברקע קודם. בדיקת התאמה קצרה וללא עלות.",
  },
  ai: {
    title: "קורס AI למפתחים | מכללת איקום",
    description: "קורס AI למפתחים, ללא צורך ברקע קודם. בדיקת התאמה קצרה וללא עלות.",
  },
};

export const metadata: Metadata = isStaticExport ? STATIC_METADATA[staticPage] : {};

export default function RootPage() {
  if (isStaticExport) {
    // This "/" route renders outside app/lp/layout.tsx (that layout only
    // wraps /lp/* routes), so — same as that layout does for every /lp/*
    // page — inject lead-config.js and analytics here too. Without this,
    // the actual deployed root URL (/cyber/ or /ai/) would never load
    // window.LEAD_SUBMIT_URL, and editing lead-config.js later would
    // silently do nothing there.
    return (
      <>
        <Script
          src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/lead-config.js`}
          strategy="beforeInteractive"
        />
        {staticPage === "ai" ? <BrandAiPage /> : <BrandCyberPage />}
        <AnalyticsScripts />
      </>
    );
  }
  redirect("/lp/brand/cyber");
}
