import { TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

export interface QualityNotice {
  /** "error": figures are missing and shown as "—". "warning": figures are shown but only partly covered. */
  tone: "error" | "warning";
  text: string;
}

/** Says plainly when a figure on screen is missing or only partly covered, so an incomplete number is never read as a complete one. */
export function DataQualityBanner({ notices }: { notices: QualityNotice[] }) {
  if (notices.length === 0) return null;

  return (
    <div className="flex flex-col gap-2" role="status">
      {notices.map((notice) => (
        <div
          key={notice.text}
          className={cn(
            "flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm leading-relaxed text-foreground",
            notice.tone === "error" ? "border-destructive/30 bg-destructive/5" : "border-warning/40 bg-warning/10"
          )}
        >
          <TriangleAlert
            className={cn("mt-0.5 size-4 shrink-0", notice.tone === "error" ? "text-destructive" : "text-warning-foreground")}
          />
          <span>{notice.text}</span>
        </div>
      ))}
    </div>
  );
}
