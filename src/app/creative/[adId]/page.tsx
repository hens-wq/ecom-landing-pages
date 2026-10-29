import type { Metadata } from "next";
import { TrendingUp } from "lucide-react";

import { CreativeOutcome } from "@/components/creative/creative-outcome";
import { normalizeAdId, type CreativeLookup } from "@/lib/creative/creative-lookup";
import { lookupAdCreative } from "@/lib/creative/meta-creative";

// Standalone, public, read-only page for sales reps who open it from a student
// record. It sits outside the dashboard group, so it has no sidebar, topbar,
// navigation or footer. Only the parsed creative view reaches the page - never
// Meta's raw response, and never the access token.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "המודעה שראה הלקוח | Ecom",
  description: "תצוגת המודעה שממנה נוצר הליד.",
  robots: { index: false, follow: false },
};

export default async function CreativePage({ params }: { params: Promise<{ adId: string }> }) {
  const { adId } = await params;
  const normalized = normalizeAdId(adId);
  const lookup: CreativeLookup = normalized.ok ? await lookupAdCreative(normalized.adId) : { status: "invalid_id" };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4 sm:px-6">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <TrendingUp className="size-4" />
          </span>
          <span className="text-sm font-bold">Ecom</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-4 py-6 sm:px-6">
        <h1 className="text-xl font-semibold text-foreground">המודעה שראה הלקוח</h1>
        <CreativeOutcome lookup={lookup} adId={normalized.ok ? normalized.adId : null} />
      </main>
    </div>
  );
}
