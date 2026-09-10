import type { LucideIcon } from "lucide-react";
import { Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export type IntegrationStatus = "not_connected" | "ready_to_configure";

const STATUS_CONFIG: Record<IntegrationStatus, { label: string; variant: "secondary" | "warning" }> = {
  not_connected: { label: "לא מחובר (Not Connected)", variant: "secondary" },
  ready_to_configure: { label: "מוכן להגדרה (Ready to Configure)", variant: "warning" },
};

export interface IntegrationDef {
  id: string;
  nameHe: string;
  nameEn: string;
  icon: LucideIcon;
  status: IntegrationStatus;
  description: string;
  willProvide: string;
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
        <p className="text-xs text-muted-foreground/80">{integration.willProvide}</p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" disabled className="w-full gap-2 text-muted-foreground">
          <Lock className="size-3.5" />
          התחברות תתאפשר בשלב הבא
        </Button>
      </CardFooter>
    </Card>
  );
}
