"use client";

import { Fragment, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";

import { AttributionNotice } from "@/components/optimization/attribution-notice";
import { TableBottomScrollbar, TableTopScrollbar } from "@/components/shared/table-top-scrollbar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bilingual, STATUS_TEXT, ToneBadge, buildEntityTree, primaryRecommendation, recommendationIndex, type TreeNode } from "@/components/optimization/shared";
import { campaignStatusesOf, inCampaignScope, type CampaignStatusFilter } from "@/lib/optimization/campaign-filter";
import { formatCount, formatIls, formatPercent } from "@/lib/optimization/format";
import { CONFIDENCE_LABELS } from "@/lib/optimization/labels";
import { LEAD_DATA_STATE_LABELS, leadDataStateOf } from "@/lib/optimization/lead-data-state";
import type { Recommendation } from "@/lib/optimization/model";
import type { RunRecord } from "@/lib/optimization/run";

/**
 * The business result, read on its own (the exposure tab shows delivery). Lead figures show "—" when they did not load.
 * A unit with no attributed lead while the window has leads that carry no unit shows its state, never a plain zero.
 */
export function LeadsTab({ record, campaignStatus }: { record: RunRecord; campaignStatus: CampaignStatusFilter }) {
  const recommendations = useMemo(() => recommendationIndex(record.output.recommendations), [record]);
  const statuses = useMemo(() => campaignStatusesOf(record.output.entities), [record]);
  const scoped = useMemo(
    () => record.output.entities.filter((entity) => inCampaignScope(entity.campaignId, statuses, campaignStatus)),
    [record, statuses, campaignStatus]
  );
  const tree = useMemo(() => buildEntityTree(scoped), [scoped]);
  const gaps = record.attributionGaps ?? null;
  const scrollRef = useRef<HTMLDivElement>(null);
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
    const state = leadDataStateOf(s, gaps);
    const stateLabel = LEAD_DATA_STATE_LABELS[state];
    // A unit with no attributed lead while leads of the window carry no unit is "attribution missing", not zero.
    const countShown = known && !(state === "attribution_missing" && s.leads === 0);
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
        <TableCell>{countShown ? formatCount(s.leads) : "—"}</TableCell>
        <TableCell>
          <ToneBadge tone={stateLabel.tone} label={`${stateLabel.en} · ${stateLabel.he}`} />
        </TableCell>
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
    <div className="space-y-3">
      <AttributionNotice gaps={gaps} />
      {scoped.length === 0 ? (
        <p className="text-sm text-slate-600">
          אין יחידות בסטטוס הנבחר בטווח הזה. בחרו &quot;All&quot; כדי לראות גם קמפיינים כבויים שהוציאו כסף.
        </p>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white">
          <TableTopScrollbar targetRef={scrollRef} />
          <Table ref={scrollRef}>
            <TableHeader>
              <TableRow>
                <TableHead><Bilingual en="Campaign / unit" he="קמפיין / יחידה" /></TableHead>
                <TableHead><Bilingual en="Leads" he="לידים בפועל" /></TableHead>
                <TableHead><Bilingual en="Lead data" he="מצב נתוני לידים" /></TableHead>
                <TableHead><Bilingual en="CPL" he="עלות לליד" /></TableHead>
                <TableHead><Bilingual en="Green" he="ירוק" /></TableHead>
                <TableHead><Bilingual en="Red" he="אדום" /></TableHead>
                <TableHead><Bilingual en="Pending" he="ממתין" /></TableHead>
                <TableHead><Bilingual en="Unmapped" he="לא ממופה" /></TableHead>
                <TableHead><Bilingual en="Classification coverage" he="כיסוי סיווג" /></TableHead>
                <TableHead><Bilingual en="Green Rate" he="שיעור ירוק" /></TableHead>
                <TableHead><Bilingual en="Red Rate" he="שיעור אדום" /></TableHead>
                <TableHead><Bilingual en="Qualified CPL" he="עלות לליד איכותי" /></TableHead>
                <TableHead><Bilingual en="Sales" he="הרשמות" /></TableHead>
                <TableHead><Bilingual en="Close Rate" he="אחוז סגירה" /></TableHead>
                <TableHead><Bilingual en="CPA" he="עלות להרשמה" /></TableHead>
                <TableHead><Bilingual en="Recorded Revenue" he="הכנסות שהוזנו" /></TableHead>
                <TableHead><Bilingual en="Business result" he="תוצאה עסקית" /></TableHead>
                <TableHead><Bilingual en="Confidence" he="רמת ביטחון" /></TableHead>
                <TableHead><Bilingual en="Recommendation" he="המלצה" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tree.map((node) => (
                <Fragment key={node.entity.key}>{renderRows(node, 0)}</Fragment>
              ))}
            </TableBody>
          </Table>
          <TableBottomScrollbar targetRef={scrollRef} />
        </div>
      )}
      <p className="text-xs text-slate-500">
        CPL לפי מדגם: מעל 80 ₪ זו מעקב, 100 ₪ ומעלה אזהרה, 150 ₪ ומעלה חריגה חמורה, ואין השהיה רק בגלל CPL כשיש הרשמות.
        Red Rate מחושב מתוך הלידים המסווגים בלבד (Green + Red). Pending ו-Unmapped לא נכנסים למכנה.
      </p>
    </div>
  );
}
