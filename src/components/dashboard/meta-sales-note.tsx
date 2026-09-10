import { Info } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

/**
 * Shown only when the advertising data on screen is real (Meta Live). Spend,
 * leads, impressions etc. above are real; Sales/Close Rate/Cost per Sale/
 * Revenue/ROAS are not - they still come from the internal/mock sales layer
 * (see lib/advertising/internal-sales.ts) because there is no real attribution
 * yet between a live Meta ad and an actual sale. This note exists specifically
 * so that isn't mistaken for real, per-campaign sales performance.
 */
export function MetaSalesNote() {
  return (
    <Card className="border-warning/40 bg-warning/[0.06]">
      <CardContent className="flex gap-3 px-5 py-3.5 text-sm leading-relaxed">
        <Info className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
        <p className="text-muted-foreground">
          נתוני ההוצאה, החשיפות והלידים למעלה הם נתוני Meta אמיתיים. מדדי{" "}
          <span className="font-medium text-foreground">מכירות, אחוז סגירה, עלות למכירה, הכנסות ו-ROAS</span> עדיין
          מבוססים על נתוני המכירות הפנימיים (מוקמלים) ואינם משויכים עדיין לקמפיינים או למודעות ספציפיות - שיוך מכירות
          אמיתי יתווסף בשלב הבא.
        </p>
      </CardContent>
    </Card>
  );
}
