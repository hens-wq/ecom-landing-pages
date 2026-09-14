import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2, Eye, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export type IntegrationStatus = "not_connected" | "ready_to_configure" | "connected" | "connection_error";

const STATUS_CONFIG: Record<IntegrationStatus, { label: string; variant: "secondary" | "warning" | "success" | "destructive" }> = {
  not_connected: { label: "לא מחובר (Not Connected)", variant: "secondary" },
  ready_to_configure: { label: "מוכן להגדרה (Ready to Configure)", variant: "warning" },
  connected: { label: "מחובר (Connected)", variant: "success" },
  connection_error: { label: "שגיאת חיבור (Connection Error)", variant: "destructive" },
};

export interface IntegrationDetail {
  label: string;
  value: string;
}

export interface IntegrationDef {
  id: string;
  nameHe: string;
  nameEn: string;
  icon: LucideIcon;
  status: IntegrationStatus;
  description: string;
  willProvide: string;
  /** Extra key/value facts shown when connected (e.g. Ad Account Name/ID). Never put secrets/tokens here. */
  details?: IntegrationDetail[];
  /** Shown instead of `willProvide` when status is "connection_error". */
  errorMessage?: string;
}

function CardFooterContent({ status }: { status: IntegrationStatus }) {
  if (status === "connected") {
    return (
      <Button variant="outline" size="sm" disabled className="w-full gap-2 text-muted-foreground">
        <Eye className="size-3.5" />
        חיבור לקריאה בלבד (Read-Only)
      </Button>
    );
  }
  if (status === "connection_error") {
    return (
      <Button variant="outline" size="sm" disabled className="w-full gap-2 text-destructive">
        <AlertTriangle className="size-3.5" />
        בדקו את משתני הסביבה
      </Button>
    );
  }
  return (
    <Button variant="outline" size="sm" disabled className="w-full gap-2 text-muted-foreground">
      <Lock className="size-3.5" />
      התחברות תתאפשר בשלב הבא
    </Button>
  );
}

export function IntegrationCard({ integration }: { integration: IntegrationDef }) {
  const Icon = integration.icon;
  const status = STATUS_CONFIG[integration.status];

  return (
    <Card>
      <CardHeader className="flex-col items-start gap-3 space-y-0">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <Icon className="size-4.5" />
          </span>
          <div>
            <div className="text-sm font-semibold text-foreground">{integration.nameHe}</div>
            <div className="text-xs text-muted-foreground">{integration.nameEn}</div>
          </div>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </CardHeader>
      <CardContent className="space-y-1.5">
        <p className="text-sm text-muted-foreground">{integration.description}</p>
        {integration.status === "connection_error" && integration.errorMessage ? (
          <p className="flex items-start gap-1.5 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 size-3 shrink-0" />
            {integration.errorMessage}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground/80">{integration.willProvide}</p>
        )}
        {integration.status === "connected" && integration.details && integration.details.length > 0 && (
          <div className="space-y-1 rounded-md border border-success/30 bg-success/[0.06] px-2.5 py-2 text-xs">
            {integration.details.map((detail) => (
              <div key={detail.label} className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{detail.label}</span>
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <CheckCircle2 className="size-3 text-success" />
                  {detail.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <CardFooterContent status={integration.status} />
      </CardFooter>
    </Card>
  );
}
