import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The colour family of a KPI. The label text beside the icon always names the figure, so colour only adds meaning and
 * never carries it alone: green = money or deals won, blue = volume and cost, orange = a share to watch.
 */
export type KpiTone = "neutral" | "info" | "success" | "warning";

const TONE_CLASSES: Record<KpiTone, string> = {
  neutral: "bg-slate-100 text-slate-600",
  info: "bg-blue-50 text-blue-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-orange-50 text-orange-700",
};

export function KpiIcon({ icon: Icon, tone }: { icon: LucideIcon; tone: KpiTone }) {
  return (
    <span aria-hidden="true" className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", TONE_CLASSES[tone])}>
      <Icon className="size-4" />
    </span>
  );
}
