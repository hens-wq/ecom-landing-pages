import { Info } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { SalesMatchesTable } from "@/components/sales-matching/matches-table";
import { SalesMatchingSummaryCards } from "@/components/sales-matching/summary-cards";
import { salesMatches, salesMatchStats } from "@/lib/mock-data";

export default function SalesMatchingPage() {
  const sortedMatches = [...salesMatches].sort(
    (a, b) => new Date(b.sale.saleDate).getTime() - new Date(a.sale.saleDate).getTime()
  );

  return (
    <div className="flex flex-col gap-5">
      <Card className="border-primary/25 bg-primary/[0.035]">
        <CardContent className="flex gap-3 px-5 py-4 text-sm leading-relaxed">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-muted-foreground">
            בשלב הבא, גיליון Google Sheets עם מכירות (שם לקוח, טלפון, תאריך מכירה, סכום) יסתנכרן לכאן אוטומטית. המערכת
            תנרמל את מספר הטלפון ותשייך את המכירה בחזרה לקמפיין ← סדרת מודעות ← מודעה - לפי מספר הטלפון בלבד, ללא
            תלות בשם הלקוח. כאשר אותו טלפון שלח כמה לידים לאורך זמן, המכירה משויכת ללִיד העדכני ביותר שקדם לתאריך
            המכירה. כרגע מוצגים נתוני דמו שממחישים את לוגיקת ההתאמה.
          </p>
        </CardContent>
      </Card>

      <SalesMatchingSummaryCards stats={salesMatchStats} />
      <SalesMatchesTable matches={sortedMatches} />
    </div>
  );
}
