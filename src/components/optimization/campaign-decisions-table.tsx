"use client";

import { useRef } from "react";

import { TableBottomScrollbar, TableTopScrollbar } from "@/components/shared/table-top-scrollbar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bilingual, LEVEL_NAMES, STATUS_TEXT, ToneBadge } from "@/components/optimization/shared";
import { DECISION_CODES, DECISION_LABELS, type CampaignDecision } from "@/lib/optimization/campaign-decisions";
import { formatCount, formatIls } from "@/lib/optimization/format";
import { CONFIDENCE_LABELS } from "@/lib/optimization/labels";

interface CampaignDecisionsTableProps {
  decisions: CampaignDecision[];
}

/**
 * One row per campaign: the single decision the rules engine gives it, the numbers behind it, the next action, and what
 * is still unknown. Warnings and the focus unit sit in the row's detail, below the decision, and never change it.
 */
export function CampaignDecisionsTable({ decisions }: CampaignDecisionsTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section className="space-y-3" aria-labelledby="campaign-decisions-heading">
      <header className="space-y-1">
        <h2 id="campaign-decisions-heading" className="text-base font-semibold text-slate-900">
          <Bilingual en="Campaign Decisions" he="החלטות לפי קמפיין" />
        </h2>
        <p className="text-xs text-slate-500">
          החלטה אחת לכל קמפיין בסטטוס הנבחר. קמפיין שלא מופיע כאן מחוץ לסטטוס שנבחר.
        </p>
      </header>

      {decisions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
          אין קמפיינים בסטטוס הנבחר בטווח הזה.
        </p>
      ) : (
        <>
          <DecisionCounts decisions={decisions} />
          <div className="rounded-lg border border-slate-200 bg-white">
            <TableTopScrollbar targetRef={scrollRef} />
            <Table ref={scrollRef}>
              <TableHeader>
                <TableRow>
                  <TableHead><Bilingual en="Campaign" he="קמפיין" /></TableHead>
                  <TableHead><Bilingual en="Decision" he="החלטה" /></TableHead>
                  <TableHead><Bilingual en="Why" he="למה" /></TableHead>
                  <TableHead><Bilingual en="Next Action" he="הפעולה הבאה" /></TableHead>
                  <TableHead><Bilingual en="Confidence" he="רמת ביטחון" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {decisions.map((item) => (
                  <DecisionRow key={item.campaignId} item={item} />
                ))}
              </TableBody>
            </Table>
            <TableBottomScrollbar targetRef={scrollRef} />
          </div>
        </>
      )}
    </section>
  );
}

function DecisionCounts({ decisions }: { decisions: CampaignDecision[] }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs text-slate-700">
      {DECISION_CODES.map((code) => {
        const count = decisions.filter((item) => item.decision === code).length;
        return (
          <span key={code} className="rounded-md bg-white px-2.5 py-1 ring-1 ring-slate-200">
            {DECISION_LABELS[code].en}: <strong>{count}</strong>
          </span>
        );
      })}
    </div>
  );
}

function DecisionRow({ item }: { item: CampaignDecision }) {
  const label = DECISION_LABELS[item.decision];
  return (
    <TableRow>
      <TableCell className="min-w-56 whitespace-normal align-top">
        <div className="font-medium text-slate-900">{item.campaignName}</div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span dir="ltr" className="font-mono">{item.campaignId}</span>
          {item.status !== "active" ? (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{STATUS_TEXT[item.status]}</span>
          ) : null}
        </div>
        <div className="mt-1 text-xs text-slate-600">
          הוצאה {formatIls(item.figures.spend)} · לידים {formatCount(item.figures.leads)} (Meta {formatCount(item.figures.metaLeads)}) · הרשמות{" "}
          {formatCount(item.figures.sales)}
        </div>
      </TableCell>
      <TableCell className="align-top">
        <ToneBadge tone={label.tone} label={`${label.en} · ${label.he}`} />
      </TableCell>
      <TableCell className="max-w-sm whitespace-normal align-top text-sm text-slate-800">{item.why}</TableCell>
      <TableCell className="max-w-md whitespace-normal align-top text-sm text-slate-800">
        <div>{item.nextAction}</div>
        <details className="mt-2 text-xs text-slate-600">
          <summary className="cursor-pointer text-slate-500">פירוט: מה עדיין לא ידוע, מתי לבדוק שוב, אזהרות</summary>
          <div className="mt-2 space-y-2">
            <p>
              <span className="font-semibold">עדיין לא ידוע: </span>
              {item.stillUnknown}
            </p>
            <p>
              <span className="font-semibold">לבדוק שוב: </span>
              {item.recheck}
            </p>
            {item.focus ? (
              <p>
                <span className="font-semibold">מוקד הבדיקה: </span>
                {LEVEL_NAMES[item.focus.level]} &quot;{item.focus.name}&quot;, הוצאה {formatIls(item.focus.spend)}: {item.focus.ruleText}.
              </p>
            ) : null}
            {item.warnings.length > 0 ? (
              <div>
                <p className="font-semibold">אזהרות (לא משנות את ההחלטה):</p>
                <ul className="list-disc space-y-0.5 pr-4">
                  {item.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </details>
      </TableCell>
      <TableCell className="whitespace-normal align-top text-sm text-slate-800">
        {item.decision === "INSUFFICIENT_DATA" && item.figures.spend === 0
          ? "לא נקבע: אין הוצאה בטווח"
          : CONFIDENCE_LABELS[item.confidence]}
      </TableCell>
    </TableRow>
  );
}
