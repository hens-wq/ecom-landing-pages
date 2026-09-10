import { Badge } from "@/components/ui/badge";
import type { EntityStatus } from "@/lib/types";

const STATUS_CONFIG: Record<EntityStatus, { label: string; variant: "success" | "warning" | "secondary" }> = {
  active: { label: "פעיל", variant: "success" },
  paused: { label: "מושהה", variant: "warning" },
  ended: { label: "הסתיים", variant: "secondary" },
};

export function StatusBadge({ status }: { status: EntityStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant={config.variant} className="rounded-full">
      <span className="size-1.5 rounded-full bg-current" />
      {config.label}
    </Badge>
  );
}
