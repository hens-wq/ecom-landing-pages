import { AlertTriangle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

/**
 * Shown only while LEAD_STATUS_PERSISTENCE_IS_REAL is false (see
 * lib/lead-status/repository.ts) - this is not decorative caution, it's an
 * accurate description of the current backing store: an in-memory Map that
 * Vercel's serverless model does not guarantee survives between requests,
 * let alone deploys. Remove this once a real database is wired in.
 */
export function PersistenceWarning() {
  return (
    <Card className="border-destructive/40 bg-destructive/[0.05]">
      <CardContent className="flex gap-3 px-5 py-3.5 text-sm leading-relaxed">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">אחסון זמני בלבד (Temporary Storage) -</span> סטטוסים וסכומי
          תשלום שנשמרים כרגע אינם מאוחסנים במסד נתונים אמיתי, ועלולים להימחק בכל רגע - בפריסה מחדש, באתחול שרת, או
          בין בקשות שונות. אין עדיין הבטחה שהעריכות ישרדו. יש לחבר מסד נתונים אמיתי לפני שימוש עסקי בפועל.
        </p>
      </CardContent>
    </Card>
  );
}
