import { AlertTriangle, Database } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export type DatabaseStatus = "checking" | "connected" | "error";

interface DatabaseStatusBadgeProps {
  status: DatabaseStatus;
  message?: string;
}

/**
 * Reflects the REAL, live state of the Postgres connection (see
 * /api/lead-status/health) - never a static claim. "connected" is a subtle
 * confirmation next to the Mock/Meta Live badge; "error" is a loud, specific
 * warning, since a broken database means status/payment edits will fail to
 * save (see api/lead-status/route.ts, which returns a clear error rather
 * than pretending a save succeeded).
 */
export function DatabaseStatusBadge({ status, message }: DatabaseStatusBadgeProps) {
  if (status === "checking") return null;

  if (status === "connected") {
    return (
      <Badge variant="success" className="gap-1">
        <Database className="size-3" />
        מסד נתונים מחובר (Database Connected)
      </Badge>
    );
  }

  return (
    <Card className="border-destructive/40 bg-destructive/[0.05]">
      <CardContent className="flex gap-3 px-5 py-3.5 text-sm leading-relaxed">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">אין חיבור למסד הנתונים (Database Not Connected) -</span>{" "}
          {message ?? "לא ניתן לשמור או לטעון סטטוסים ותשלומים כרגע."}
        </p>
      </CardContent>
    </Card>
  );
}
