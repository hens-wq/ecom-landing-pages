import type { Metadata } from "next";

import { CreativeOutcome } from "@/components/creative/creative-outcome";
import { normalizeAdId, type CreativeLookup } from "@/lib/creative/creative-lookup";
import { lookupAdCreative } from "@/lib/creative/meta-creative";

// Public, read-only page for sales reps who open it from a student record. Only
// the parsed creative view reaches the page - never Meta's raw response, and
// never the access token.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "המודעה שראה הלקוח (Ad Creative)",
  robots: { index: false, follow: false },
};

export default async function CreativePage({ params }: { params: Promise<{ adId: string }> }) {
  const { adId } = await params;
  const normalized = normalizeAdId(adId);
  const lookup: CreativeLookup = normalized.ok ? await lookupAdCreative(normalized.adId) : { status: "invalid_id" };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">המודעה שראה הלקוח (Ad Creative)</h1>
        <p className="text-sm text-muted-foreground">תצוגה לקריאה בלבד של המודעה שממנה נוצר הליד.</p>
      </header>
      <CreativeOutcome lookup={lookup} adId={normalized.ok ? normalized.adId : null} />
    </div>
  );
}
