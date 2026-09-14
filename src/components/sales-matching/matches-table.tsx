import { AlertTriangle, Info } from "lucide-react";

import { MatchStatusBadge } from "@/components/shared/match-status-badge";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LEAD_SOURCE_LABELS } from "@/lib/constants";
import { formatCurrency, formatDateTime, formatTimeToSale } from "@/lib/format";
import { formatPhoneDisplay } from "@/lib/phone";
import type { SalesMatch } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SalesMatchesTable({ matches }: { matches: SalesMatch[] }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">
          מכירות שהתקבלו <span className="font-normal text-muted-foreground">(מדמה טעינה מ-Google Sheets)</span>
        </h2>
        <p className="text-xs text-muted-foreground">
          התאמה מבוצעת לפי מספר טלפון מנורמל בלבד - שם הלקוח מוצג להפניה בלבד ואינו משפיע על ההתאמה. כאשר לאותו
          טלפון קיימים מספר לידים, המכירה משויכת ללִיד העדכני ביותר שקדם לתאריך המכירה. כאשר הטלפון תואם אך השם שונה
          משמעותית, ההתאמה נשארת בתוקף ומתווספת אזהרת &quot;אי התאמה בשם&quot; למידע בלבד.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="sticky right-0 z-10 min-w-36 border-l border-border bg-card">שם לקוח (Customer Name)</TableHead>
            <TableHead className="min-w-32">טלפון (Phone)</TableHead>
            <TableHead className="min-w-36">תאריך כניסת ליד (Lead Date)</TableHead>
            <TableHead className="min-w-36">תאריך מכירה (Sale Date)</TableHead>
            <TableHead className="min-w-32">
              <span className="inline-flex items-center gap-1">
                זמן לסגירה (Time to Sale)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="size-3 shrink-0 cursor-help text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-64">
                    הסיווג ל-One Shot (כרגע: תוך 24 שעות) הוא ערך זמני לשלב 1 בלבד ואינו כלל עסקי סופי - הוא ייקבע
                    מחדש בהמשך לפי ניתוח נתוני מכירות אמיתיים. הזמן המדויק תמיד מוצג כאן ללא תלות בסיווג.
                  </TooltipContent>
                </Tooltip>
              </span>
            </TableHead>
            <TableHead className="min-w-28 text-left font-semibold text-foreground">סכום מכירה (Sale Amount)</TableHead>
            <TableHead className="min-w-44">קמפיין (Campaign)</TableHead>
            <TableHead className="min-w-44">סדרת מודעות (Ad Set)</TableHead>
            <TableHead className="min-w-44">מודעה (Ad)</TableHead>
            <TableHead className="min-w-32">מקור הליד (Lead Source)</TableHead>
            <TableHead className="min-w-36">סטטוס התאמה (Match Status)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matches.map((match) => (
            <TableRow key={match.id}>
              <TableCell className="sticky right-0 z-10 border-l border-border bg-card font-medium">{match.sale.customerName}</TableCell>
              <TableCell className="tabular-nums-he text-muted-foreground" dir="ltr">
                {formatPhoneDisplay(match.sale.phone)}
              </TableCell>
              <TableCell className="tabular-nums-he text-muted-foreground">{formatDateTime(match.leadDate)}</TableCell>
              <TableCell className="tabular-nums-he text-muted-foreground">{formatDateTime(match.sale.saleDate)}</TableCell>
              <TableCell
                className={cn(
                  "text-muted-foreground",
                  match.timeToSaleBucket === "one_shot" && "font-medium text-success"
                )}
              >
                {formatTimeToSale(match.timeToSaleMinutes)}
              </TableCell>
              <TableCell className="text-left font-semibold tabular-nums-he text-foreground">
                {formatCurrency(match.sale.saleAmount)}
              </TableCell>
              <TableCell className="text-muted-foreground">{match.campaignName ?? "-"}</TableCell>
              <TableCell className="text-muted-foreground">{match.adSetName ?? "-"}</TableCell>
              <TableCell className="text-muted-foreground">{match.adName ?? "-"}</TableCell>
              <TableCell className="text-muted-foreground">
                {match.sourceType ? LEAD_SOURCE_LABELS[match.sourceType].short : "-"}
              </TableCell>
              <TableCell>
                <div className="flex flex-col items-start gap-1">
                  <MatchStatusBadge status={match.matchStatus} />
                  {match.matchStatus === "matched" && match.nameMismatch && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="warning" className="cursor-help gap-1 text-[10px]">
                          <AlertTriangle className="size-3" />
                          אי התאמה בשם
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-64">
                        שם הלקוח בגיליון (&quot;{match.sale.customerName}&quot;) שונה משם הליד המקורי (&quot;
                        {match.lead?.name}&quot;) - ההתאמה עדיין בוצעה לפי מספר הטלפון בלבד. מידע בלבד, ללא השפעה על
                        השיוך (Name Mismatch).
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
