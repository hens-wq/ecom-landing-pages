"use client";

import { useMemo } from "react";

import { AttributionNotice } from "@/components/optimization/attribution-notice";
import { RecommendationCard } from "@/components/optimization/recommendation-card";
import { campaignStatusesOf, inCampaignScope, type CampaignStatusFilter } from "@/lib/optimization/campaign-filter";
import { ACTION_STATUS_LABELS, ACTION_STATUS_VALUES, PRIORITY_LABELS, type ActionStatus } from "@/lib/optimization/labels";
import type { Priority, Recommendation } from "@/lib/optimization/model";
import type { RunRecord } from "@/lib/optimization/run";

const PRIORITIES: Priority[] = [1, 2, 3, 4, 5, 6, 7, 8];

interface SummaryTabProps {
  record: RunRecord;
  statuses: Record<string, ActionStatus>;
  onStatus: (recommendation: Recommendation, status: ActionStatus) => void;
  campaignStatus: CampaignStatusFilter;
}

/**
 * Every recommendation of the run, grouped by the spec's eight priorities, for the campaign scope on screen. Each one carries
 * the person's status. The status is documentation only: "בוצע" records what was done in Meta, and nothing is sent to Meta.
 */
export function SummaryTab({ record, statuses, onStatus, campaignStatus }: SummaryTabProps) {
  const campaignStatuses = useMemo(() => campaignStatusesOf(record.output.entities), [record]);
  const visible = useMemo(
    () => record.output.recommendations.filter((item) => inCampaignScope(item.campaignId, campaignStatuses, campaignStatus)),
    [record, campaignStatuses, campaignStatus]
  );

  const grouped = useMemo(() => {
    const groups = new Map<Priority, Recommendation[]>();
    for (const priority of PRIORITIES) groups.set(priority, []);
    for (const recommendation of visible) groups.get(recommendation.priority)?.push(recommendation);
    return groups;
  }, [visible]);

  const statusCounts = useMemo(() => {
    const counts: Record<ActionStatus, number> = { pending: 0, done: 0, not_done: 0 };
    for (const recommendation of visible) {
      counts[statuses[recommendation.id] ?? "pending"] += 1;
    }
    return counts;
  }, [visible, statuses]);

  if (record.output.recommendations.length === 0) {
    return (
      <div className="space-y-3">
        <AttributionNotice gaps={record.attributionGaps ?? null} />
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
          לא נמצאו המלצות בטווח הזה. זה לא אומר שהכול תקין: בדקו את ההערות על הנתונים בראש הדוח.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AttributionNotice gaps={record.attributionGaps ?? null} />

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
          אין המלצות ליחידות בסטטוס הנבחר בטווח הזה. בחרו &quot;All&quot; כדי לראות גם קמפיינים כבויים.
        </p>
      ) : null}

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
