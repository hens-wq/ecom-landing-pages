"use client";

import { useMemo } from "react";

import { RecommendationCard } from "@/components/optimization/recommendation-card";
import { ACTION_STATUS_LABELS, ACTION_STATUS_VALUES, PRIORITY_LABELS, type ActionStatus } from "@/lib/optimization/labels";
import type { Priority, Recommendation } from "@/lib/optimization/model";
import type { RunRecord } from "@/lib/optimization/run";

const PRIORITIES: Priority[] = [1, 2, 3, 4, 5, 6, 7, 8];

interface SummaryTabProps {
  record: RunRecord;
  statuses: Record<string, ActionStatus>;
  onStatus: (recommendation: Recommendation, status: ActionStatus) => void;
}

/**
 * Every recommendation of the run, grouped by the spec's eight priorities. Each one carries the person's status. The
 * status is documentation only: "בוצע" records what was done in Meta, and nothing is sent to Meta.
 */
export function SummaryTab({ record, statuses, onStatus }: SummaryTabProps) {
  const grouped = useMemo(() => {
    const groups = new Map<Priority, Recommendation[]>();
    for (const priority of PRIORITIES) groups.set(priority, []);
    for (const recommendation of record.output.recommendations) groups.get(recommendation.priority)?.push(recommendation);
    return groups;
  }, [record]);

  const statusCounts = useMemo(() => {
    const counts: Record<ActionStatus, number> = { pending: 0, done: 0, not_done: 0 };
    for (const recommendation of record.output.recommendations) {
      counts[statuses[recommendation.id] ?? "pending"] += 1;
    }
    return counts;
  }, [record, statuses]);

  if (record.output.recommendations.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
        לא נמצאו המלצות בטווח הזה. זה לא אומר שהכול תקין: בדקו את ההערות על הנתונים בראש הדוח.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 text-sm">
        {ACTION_STATUS_VALUES.map((value) => (
          <span key={value} className="rounded-md bg-white px-3 py-1.5 ring-1 ring-slate-200">
            {ACTION_STATUS_LABELS[value]}: <strong>{statusCounts[value]}</strong>
          </span>
        ))}
      </div>

      {PRIORITIES.map((priority) => {
        const items = grouped.get(priority) ?? [];
        if (items.length === 0) return null;
        return (
          <section key={priority} className="space-y-3">
            <h2 className="text-base font-semibold text-slate-900">
              {priority}. {PRIORITY_LABELS[priority]} <span className="text-sm font-normal text-slate-500">({items.length})</span>
            </h2>
            <div className="grid gap-4">
              {items.map((recommendation) => (
                <RecommendationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                  status={statuses[recommendation.id] ?? "pending"}
                  onStatus={(status) => onStatus(recommendation, status)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
