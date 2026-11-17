"use client";

import { ACTION_STATUS_LABELS, ACTION_STATUS_VALUES, type ActionStatus } from "@/lib/optimization/labels";
import { cn } from "@/lib/utils";

/**
 * The person's own status for one action. It is documentation only: "בוצע" records what was done in Meta, and nothing
 * is sent to Meta from here.
 */
export function ActionStatusControl({ status, onStatus }: { status: ActionStatus; onStatus: (status: ActionStatus) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
      <span className="text-xs text-slate-500">סטטוס הפעולה (תיעוד בלבד, לא נשלח למטא):</span>
      {ACTION_STATUS_VALUES.map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={status === value}
          onClick={() => onStatus(value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors",
            status === value ? "bg-slate-800 text-white ring-slate-800" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"
          )}
        >
          {ACTION_STATUS_LABELS[value]}
        </button>
      ))}
    </div>
  );
}
