import { AlertCircle, Inbox, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function AdvertisingLoadingPanel() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-2 px-5 py-16 text-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">טוען נתוני פרסום...</p>
      </CardContent>
    </Card>
  );
}

interface AdvertisingErrorPanelProps {
  code: string;
  message: string;
  onRetry: () => void;
}

export function AdvertisingErrorPanel({ code, message, onRetry }: AdvertisingErrorPanelProps) {
  return (
    <Card className="border-destructive/30 bg-destructive/[0.03]">
      <CardContent className="flex flex-col items-center gap-3 px-5 py-12 text-center">
        <AlertCircle className="size-6 text-destructive" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">לא ניתן היה לטעון נתוני פרסום מ-Meta</p>
          <p className="max-w-md text-sm text-muted-foreground">{message}</p>
          <p className="font-mono text-[11px] text-muted-foreground/70">קוד שגיאה: {code}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
          נסה שוב
        </Button>
      </CardContent>
    </Card>
  );
}

export function EmptyCampaignsPanel() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 px-5 py-16 text-center">
        <Inbox className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">אין קמפיינים להצגה בטווח התאריכים שנבחר</p>
        <p className="text-xs text-muted-foreground">חשבון הפרסום מחובר בהצלחה, אך לא נמצאו נתונים לתקופה זו</p>
      </CardContent>
    </Card>
  );
}
