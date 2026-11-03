"use client";

import { useMemo, useState } from "react";

import { RecommendationCard } from "@/components/optimization/recommendation-card";
import { ACTION_CODES, ACTION_LABELS, type ActionCode } from "@/lib/optimization/labels";
import type { Level } from "@/lib/optimization/model";
import type { RunRecord } from "@/lib/optimization/run";

const LEVEL_OPTIONS: Array<{ value: "all" | Level; label: string }> = [
  { value: "all", label: "כל הרמות" },
  { value: "campaign", label: "קמפיין" },
  { value: "adset", label: "Ad Set" },
  { value: "ad", label: "מודעה" },
];

/**
 * The optimization queue in the spec's full recommendation format, one card per recommendation, read-only. It is the
 * list the optimization agent works from; the summary tab is where a person records what they did.
 */
export function SonilTab({ record }: { record: RunRecord }) {
  const [action, setAction] = useState<"all" | ActionCode>("all");
  const [level, setLevel] = useState<"all" | Level>("all");

  const visible = useMemo(
    () =>
      record.output.recommendations.filter(
        (recommendation) => (action === "all" || recommendation.action === action) && (level === "all" || recommendation.level === level)
      ),
    [record, action, level]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-slate-600">פעולה</span>
          <select value={action} onChange={(event) => setAction(event.target.value as "all" | ActionCode)} className="rounded-md border border-slate-300 bg-white px-2 py-1">
            <option value="all">כל הפעולות</option>
            {ACTION_CODES.map((code) => (
              <option key={code} value={code}>
                {ACTION_LABELS[code]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-slate-600">רמה</span>
          <select value={level} onChange={(event) => setLevel(event.target.value as "all" | Level)} className="rounded-md border border-slate-300 bg-white px-2 py-1">
            {LEVEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <span className="text-slate-500">{visible.length} המלצות</span>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
          אין המלצות לסינון הזה בדוח.
        </p>
      ) : (
        <div className="grid gap-4">
          {visible.map((recommendation) => (
            <RecommendationCard key={recommendation.id} recommendation={recommendation} />
          ))}
        </div>
      )}
    </div>
  );
}
