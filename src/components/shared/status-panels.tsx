import { AlertCircle, Inbox, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function LoadingPanel({ label = "טוען נתונים..." }: { label?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-2 px-5 py-16 text-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

interface ApiErrorPanelProps {
  title?: string;
  code: string;
  message: string;
  onRetry: () => void;
}

export function ApiErrorPanel({ title = "לא ניתן היה לטעון נתונים מ-Meta", code, message, onRetry }: ApiErrorPanelProps) {
  return (
    <Card className="border-destructive/30 bg-destructive/[0.03]">
      <CardContent className="flex flex-col items-center gap-3 px-5 py-12 text-center">
        <AlertCircle className="size-6 text-destructive" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
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

interface EmptyStatePanelProps {
  title: string;
  description: string;
}

export function EmptyStatePanel({ title, description }: EmptyStatePanelProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 px-5 py-16 text-center">
        <Inbox className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
