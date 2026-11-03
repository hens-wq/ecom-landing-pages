"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { STATUS_TEXT, ToneBadge, buildEntityTree, primaryRecommendation, recommendationIndex, type TreeNode } from "@/components/optimization/shared";
import { formatCount, formatIls, formatPercent } from "@/lib/optimization/format";
import { CONFIDENCE_LABELS } from "@/lib/optimization/labels";
import type { Recommendation } from "@/lib/optimization/model";
import type { RunRecord } from "@/lib/optimization/run";

/** The business result, read on its own (the exposure tab shows delivery). Lead figures show "—" when they did not load. */
export function LeadsTab({ record }: { record: RunRecord }) {
  const recommendations = useMemo(() => recommendationIndex(record.output.recommendations), [record]);
  const tree = useMemo(() => buildEntityTree(record.output.entities), [record]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const renderRows = (node: TreeNode, depth: number): ReactNode[] => {
    const { entity } = node;
    const isOpen = expanded.has(entity.key);
    const s = entity.selected;
    const known = s.leadsKnown;
    const top: Recommendation | null = primaryRecommendation(entity, recommendations);
    const rows: ReactNode[] = [
      <TableRow key={entity.key} className={depth === 0 ? "bg-slate-50 font-medium" : undefined}>
        <TableCell className="min-w-64">
          <div className="flex items-center gap-2" style={{ paddingInlineStart: `${depth * 16}px` }}>
            {node.children.length > 0 ? (
              <button type="button" onClick={() => toggle(entity.key)} aria-expanded={isOpen} aria-label={isOpen ? "סגירה" : "פתיחה"} className="text-slate-500 hover:text-slate-900">
                {isOpen ? <ChevronDown className="size-4" /> : <ChevronLeft className="size-4" />}
              </button>
            ) : (
              <span className="inline-block w-4" />
            )}
            <div>
              <div className="text-slate-900">{entity.name}</div>
              <div className="text-xs text-slate-500">
                {STATUS_TEXT[entity.status]} · <span dir="ltr" className="font-mono">{entity.id}</span>
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell>{known ? formatCount(s.leads) : "—"}</TableCell>
        <TableCell>{known ? formatIls(s.cpl) : "—"}</TableCell>
        <TableCell>{known ? formatCount(s.green) : "—"}</TableCell>
        <TableCell>{known ? formatCount(s.red) : "—"}</TableCell>
        <TableCell>{known ? formatCount(s.pending) : "—"}</TableCell>
        <TableCell>{known ? formatCount(s.unmapped) : "—"}</TableCell>
        <TableCell>{known ? formatPercent(s.classificationCoverage) : "—"}</TableCell>
        <TableCell>{known ? formatPercent(s.greenRate) : "—"}</TableCell>
        <TableCell>{known ? formatPercent(s.redRate) : "—"}</TableCell>
        <TableCell>{known ? formatIls(s.qualifiedCpl) : "—"}</TableCell>
        <TableCell>{known ? formatCount(s.sales) : "—"}</TableCell>
        <TableCell>{known ? formatPercent(s.closeRate) : "—"}</TableCell>
        <TableCell>{known ? formatIls(s.cpa) : "—"}</TableCell>
        <TableCell>{known ? formatIls(s.revenue) : "—"}</TableCell>
        <TableCell>
          <ToneBadge tone={entity.businessTone} label={entity.businessLabel} />
        </TableCell>
        <TableCell className="text-xs">{top ? CONFIDENCE_LABELS[top.confidence] : "—"}</TableCell>
        <TableCell>{top ? <ToneBadge tone={top.tone} label={top.actionLabel} /> : <span className="text-xs text-slate-500">ללא המלצה</span>}</TableCell>
      </TableRow>,
    ];
    if (isOpen) for (const child of node.children) rows.push(...renderRows(child, depth + 1));
    return rows;
  };

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>קמפיין / יחידה</TableHead>
              <TableHead>לידים בפועל</TableHead>
              <TableHead>CPL</TableHead>
              <TableHead>Green</TableHead>
              <TableHead>Red</TableHead>
              <TableHead>Pending</TableHead>
              <TableHead>Unmapped</TableHead>
              <TableHead>כיסוי סיווג</TableHead>
              <TableHead>Green Rate</TableHead>
              <TableHead>Red Rate</TableHead>
              <TableHead>Qualified CPL</TableHead>
              <TableHead>הרשמות</TableHead>
              <TableHead>Close Rate</TableHead>
              <TableHead>CPA / עלות להרשמה</TableHead>
              <TableHead>הכנסות שנרשמו</TableHead>
              <TableHead>תוצאה עסקית</TableHead>
              <TableHead>רמת ביטחון</TableHead>
              <TableHead>המלצה</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tree.map((node) => (
              <Fragment key={node.entity.key}>{renderRows(node, 0)}</Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-slate-500">
        CPL לפי מדגם: מעל 80 ₪ זו מעקב, 100 ₪ ומעלה אזהרה, 150 ₪ ומעלה חריגה חמורה, ואין השהיה רק בגלל CPL כשיש הרשמות.
        Red Rate מחושב מתוך הלידים המסווגים בלבד (Green + Red). Pending ו-Unmapped לא נכנסים למכנה.
      </p>
    </div>
  );
}
