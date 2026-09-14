import { Radio, TestTube2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { AdvertisingSource } from "@/lib/advertising";

/**
 * Small, deliberately unobtrusive indicator of where the advertising data on
 * screen actually came from - the whole point is to make it impossible during
 * development (or a live demo) to mistake mock data for a real account's
 * numbers, without this taking over the UI.
 */
export function DataSourceBadge({ source }: { source: AdvertisingSource | undefined }) {
  if (!source) return null;

  if (source === "meta") {
    return (
      <Badge variant="success" className="gap-1">
        <Radio className="size-3" />
        Meta Live
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1 text-muted-foreground">
      <TestTube2 className="size-3" />
      Mock Data
    </Badge>
  );
}
