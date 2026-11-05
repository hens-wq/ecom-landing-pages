"use client";

import { CONFIDENCE_LABELS, type ActionStatus } from "@/lib/optimization/labels";
import type { Recommendation } from "@/lib/optimization/model";
import { ActionStatusControl } from "@/components/optimization/action-status";
import { LEVEL_NAMES, ToneBadge } from "@/components/optimization/shared";

interface RecommendationCardProps {
  recommendation: Recommendation;
  /** Present on the summary tab only: the person's own action status, and how to change it. */
  status?: ActionStatus;
  onStatus?: (status: ActionStatus) => void;
}

const SECTION_LABEL = "text-[11px] font-semibold text-slate-500";

/** Every field the spec's recommendation format asks for, in the spec's order. */
export function RecommendationCard({ recommendation: r, status, onStatus }: RecommendationCardProps) {
  return (
    <article className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="text-xs text-slate-500">
            {LEVEL_NAMES[r.level]} · {r.priorityLabel}
          </div>
          <div className="font-semibold text-slate-900">{r.entityName}</div>
          <div className="text-xs text-slate-500">
            ID: <span dir="ltr" className="font-mono">{r.entityId}</span> · קמפיין: {r.campaignName}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <ToneBadge tone={r.tone} label={r.actionLabel} />
          {r.secondaryAction ? <span className="text-xs text-slate-600">{r.secondaryAction}</span> : null}
        </div>
      </header>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className={SECTION_LABEL}>עובדות ומספרים</dt>
          <dd>
            <ul className="list-disc space-y-0.5 pr-4 text-slate-800">
              {r.facts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          </dd>
        </div>
        <div>
          <dt className={SECTION_LABEL}>הכלל שהופעל</dt>
          <dd className="text-slate-800">
            <span dir="ltr" className="font-mono text-xs text-slate-500">{r.ruleCode}</span>
            <div>{r.ruleText}</div>
          </dd>
        </div>
        <div>
          <dt className={SECTION_LABEL}>הסיבה</dt>
          <dd className="text-slate-800">{r.reason}</dd>
        </div>
        <div>
          <dt className={SECTION_LABEL}>רמת ביטחון</dt>
          <dd className="text-slate-800">
            {CONFIDENCE_LABELS[r.confidence]}
            {r.flags.length > 0 ? <span className="mr-2 text-xs text-slate-500">({r.flags.join(", ")})</span> : null}
          </dd>
        </div>
        <div>
          <dt className={SECTION_LABEL}>נתונים חסרים</dt>
          <dd className="text-slate-800">
            {r.missingData.length > 0 ? (
              <ul className="list-disc pr-4">
                {r.missingData.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              r.action === "CHECK_DATA" ? "מקור הפער טרם אומת — נדרשת בדיקה" : "אין"
            )}
          </dd>
        </div>
        <div>
          <dt className={SECTION_LABEL}>הבדיקה הבאה</dt>
          <dd className="text-slate-800">{r.nextCheck}</dd>
        </div>
      </dl>

      {r.notes.length > 0 ? (
        <ul className="space-y-1 rounded-md bg-slate-50 p-2 text-xs text-slate-700">
          {r.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      {onStatus && status ? <ActionStatusControl status={status} onStatus={onStatus} /> : null}
    </article>
  );
}
