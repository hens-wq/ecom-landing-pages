import { Badge } from "@/components/ui/badge";
import type { MatchStatus } from "@/lib/types";

const MATCH_STATUS_CONFIG: Record<MatchStatus, { label: string; variant: "success" | "warning" | "destructive" }> = {
  matched: { label: "הותאם", variant: "success" },
  needs_review: { label: "דורש בדיקה", variant: "warning" },
  unmatched: { label: "ללא התאמה", variant: "destructive" },
};

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  const config = MATCH_STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
