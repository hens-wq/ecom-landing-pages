import { Lightbulb } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { findAdRow, type CampaignRow } from "@/lib/aggregate";
import { formatCurrency, formatMultiplier, formatPercent } from "@/lib/format";

/**
 * A concrete illustration of the product's whole reason for existing: pulled live
 * from the same computed metrics as the table below, never hardcoded numbers.
 */
export function InsightsCallout({ campaignRows }: { campaignRows: CampaignRow[] }) {
  const cheapLeadAd = findAdRow(campaignRows, "ad-ai-coupon");
  const highCloseAd = findAdRow(campaignRows, "ad-ai-video");

  if (!cheapLeadAd || !highCloseAd) return null;

  return (
    <Card className="border-primary/25 bg-primary/[0.035]">
      <CardContent className="flex gap-3 px-5 py-4">
        <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="space-y-1 text-sm leading-relaxed">
          <p className="font-semibold text-foreground">תובנה: עלות ליד זולה לא שווה בהכרח לקוח טוב</p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">{cheapLeadAd.name}</span> מביאה לידים בעלות של{" "}
            <span className="font-medium text-foreground">{formatCurrency(cheapLeadAd.metrics.cpl)}</span>, אבל עלות
            למכירה שלה היא <span className="font-medium text-destructive">{formatCurrency(cheapLeadAd.metrics.costPerSale)}</span> - כלומר כמעט
            ואין מכירות בפועל. לעומתה, <span className="font-medium text-foreground">{highCloseAd.name}</span> יקרה יותר
            ללידים ({formatCurrency(highCloseAd.metrics.cpl)}) אך סוגרת {formatPercent(highCloseAd.metrics.closeRate, 1)}{" "}
            מהלידים, עם עלות למכירה של{" "}
            <span className="font-medium text-success">{formatCurrency(highCloseAd.metrics.costPerSale)}</span> ו-ROAS של{" "}
            <span className="font-medium text-success">{formatMultiplier(highCloseAd.metrics.roas)}</span>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
