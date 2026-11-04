"use client";

import { Fragment, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";

import { TableBottomScrollbar, TableTopScrollbar } from "@/components/shared/table-top-scrollbar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bilingual, STATUS_TEXT, ToneBadge, buildEntityTree, primaryRecommendation, recommendationIndex, type TreeNode } from "@/components/optimization/shared";
import { campaignStatusesOf, inCampaignScope, type CampaignStatusFilter } from "@/lib/optimization/campaign-filter";
import { trendChanges, type TrendChanges } from "@/lib/optimization/context";
import { formatChange, formatCount, formatIls, formatIlsExact, formatPercent, formatRatio } from "@/lib/optimization/format";
import { CONFIDENCE_LABELS, TONE_LABELS } from "@/lib/optimization/labels";
import type { Recommendation } from "@/lib/optimization/model";
import type { RunRecord } from "@/lib/optimization/run";

/** Campaign health is read in two separate states: exposure (this tab) and business result (the leads tab). */

function trendText(changes: TrendChanges): string {
  const parts: string[] = [];
  if (changes.reach !== null) parts.push(`Reach ${formatChange(changes.reach)}`);
  if (changes.ctr !== null) parts.push(`CTR ${formatChange(changes.ctr)}`);
  if (changes.cpc !== null) parts.push(`CPC ${formatChange(changes.cpc)}`);
  if (changes.cpm !== null) parts.push(`CPM ${formatChange(changes.cpm)}`);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function ExposureTab({ record, campaignStatus }: { record: RunRecord; campaignStatus: CampaignStatusFilter }) {
  const recommendations = useMemo(() => recommendationIndex(record.output.recommendations), [record]);
  // The same campaign scope as the other three tabs: a unit is in or out by its campaign's status.
  const statuses = useMemo(() => campaignStatusesOf(record.output.entities), [record]);
  const scoped = useMemo(
    () => record.output.entities.filter((entity) => inCampaignScope(entity.campaignId, statuses, campaignStatus)),
    [record, statuses, campaignStatus]
  );
  const tree = useMemo(() => buildEntityTree(scoped), [scoped]);
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
    const hasChildren = node.children.length > 0;
    const top: Recommendation | null = primaryRecommendation(entity, recommendations);
    const selected = entity.selected;
    const changes = trendChanges(entity.current, entity.previous);
    const rows: ReactNode[] = [
      <TableRow key={entity.key} className={depth === 0 ? "bg-slate-50 font-medium" : undefined}>
        <TableCell className="min-w-64">
          <div className="flex items-center gap-2" style={{ paddingInlineStart: `${depth * 16}px` }}>
            {hasChildren ? (
              <button type="button" onClick={() => toggle(entity.key)} aria-expanded={isOpen} className="text-slate-500 hover:text-slate-900" aria-label={isOpen ? "סגירה" : "פתיחה"}>
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
        <TableCell>{formatIls(selected.spend)}</TableCell>
        <TableCell>{selected.reachKnown ? formatCount(selected.reach) : "—"}</TableCell>
        <TableCell>{formatCount(selected.impressions)}</TableCell>
        <TableCell>{formatRatio(selected.frequency)}</TableCell>
        <TableCell>{formatCount(selected.linkClicks)}</TableCell>
        <TableCell>{formatPercent(selected.ctr, 2)}</TableCell>
        <TableCell>{formatIlsExact(selected.cpc)}</TableCell>
        <TableCell>{formatIlsExact(selected.cpm)}</TableCell>
        <TableCell className="text-xs text-slate-600">{trendText(changes)}</TableCell>
        <TableCell>
          <ToneBadge tone={entity.exposureTone} label={entity.exposureLabel} />
        </TableCell>
        <TableCell className="text-xs">{top ? CONFIDENCE_LABELS[top.confidence] : "—"}</TableCell>
        <TableCell>{top ? <ToneBadge tone={top.tone} label={top.actionLabel} /> : <span className="text-xs text-slate-500">ללא המלצה</span>}</TableCell>
        <TableCell className="max-w-72 text-xs text-slate-700">
          {top ? top.facts[0] : entity.evaluationNotes[0] ?? "אין שינוי מומלץ בטווח הזה."}
        </TableCell>
      </TableRow>,
    ];
    if (isOpen) for (const child of node.children) rows.push(...renderRows(child, depth + 1));
    return rows;
  };

  if (record.output.entities.length === 0) {
    return <p className="text-sm text-slate-600">אין קמפיינים עם נתונים בטווח הזה.</p>;
  }
  if (scoped.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        אין יחידות בסטטוס הנבחר בטווח הזה. בחרו &quot;All&quot; כדי לראות גם קמפיינים כבויים שהוציאו כסף.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <TableTopScrollbar targetRef={scrollRef} />
      <Table ref={scrollRef}>
        <TableHeader>
          <TableRow>
            <TableHead><Bilingual en="Campaign / unit" he="קמפיין / יחידה" /></TableHead>
            <TableHead><Bilingual en="Spend" he="הוצאה" /></TableHead>
            <TableHead><Bilingual en="Reach" he="תפוצה" /></TableHead>
            <TableHead><Bilingual en="Impressions" he="חשיפות" /></TableHead>
            <TableHead><Bilingual en="Frequency" he="תדירות" /></TableHead>
            <TableHead><Bilingual en="Link Clicks" he="קליקים על קישור" /></TableHead>
            <TableHead><Bilingual en="Link CTR" he="שיעור הקלקה" /></TableHead>
            <TableHead><Bilingual en="Link CPC" he="עלות לקליק" /></TableHead>
            <TableHead><Bilingual en="CPM" he="עלות לאלף חשיפות" /></TableHead>
            <TableHead><Bilingual en="Trend" he="מגמה מול התקופה הקודמת" /></TableHead>
            <TableHead><Bilingual en="Exposure" he="חשיפה" /></TableHead>
            <TableHead><Bilingual en="Confidence" he="רמת ביטחון" /></TableHead>
            <TableHead><Bilingual en="Recommendation" he="המלצה" /></TableHead>
            <TableHead><Bilingual en="Numbers" he="הסבר מספרי" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tree.map((node) => (
            <Fragment key={node.entity.key}>{renderRows(node, 0)}</Fragment>
          ))}
        </TableBody>
      </Table>
      <TableBottomScrollbar targetRef={scrollRef} />
      <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
        Frequency נשפטת רק בטווח של 7 ימים. CTR ו-CPM נשפטים רק כשיש מדגם של לפחות 2,000 Impressions בכל תקופה. מדד שאין לו מספיק נתונים מסומן באפור: {TONE_LABELS.insufficient}.
      </p>
    </div>
  );
}
