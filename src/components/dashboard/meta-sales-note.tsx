import { Info } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

/**
 * Shown only when the advertising data on screen is real (Meta Live). Spend,
 * leads, impressions etc. above are real; Sales/Close Rate/Cost per Sale/
 * Revenue/ROAS are shown as "טרם חובר" (Not Connected) - there is no real
 * sales-attribution source wired up yet, so these are intentionally left
 * blank rather than populated from the mock sales layer (which would look
 * like real per-campaign performance but isn't).
 */
export function MetaSalesNote() {
  return (
    <Card className="border-warning/40 bg-warning/[0.06]">
      <CardContent className="flex gap-3 px-5 py-3.5 text-sm leading-relaxed">
        <Info className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
        <p className="text-muted-foreground">
          נתוני ההוצאה, החשיפות והלידים למעלה הם נתוני Meta אמיתיים. מדדי{" "}
          <span className="font-medium text-foreground">מכירות, אחוז סגירה, עלות למכירה, הכנסות ו-ROAS</span> מוצגים
          כ&quot;טרם חובר&quot; - עדיין אין חיבור לנתוני מכירות אמיתיים המשויכים לקמפיינים וללידים. חיבור שיוך מכירות
          אמיתי יתווסף בשלב הבא.
        </p>
      </CardContent>
    </Card>
  );
}
