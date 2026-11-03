"use client";

import { useMemo, useRef } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Image as ImageIcon, Layers3, Megaphone } from "lucide-react";

import { ColumnVisibilityMenu } from "@/components/dashboard/column-visibility-menu";
import { useDashboardColumns } from "@/components/dashboard/use-dashboard-columns";
import { CplTierBadge } from "@/components/shared/cpl-tier-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { TableTopScrollbar } from "@/components/shared/table-top-scrollbar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { AdRow, AdSetRow, CampaignRow } from "@/lib/aggregate";
import type { PerformanceColumnDef } from "@/lib/columns";
import { LEAD_SOURCE_LABELS } from "@/lib/constants";
import { cellDisplay } from "@/lib/performance/display";
import type { SortKey, SortState } from "@/lib/performance/sort";
import { cn } from "@/lib/utils";

type FlatRow =
  | { type: "campaign"; row: CampaignRow }
  | { type: "adset"; row: AdSetRow }
  | { type: "ad"; row: AdRow };

function flattenRows(campaignRows: CampaignRow[], expanded: Set<string>): FlatRow[] {
  const flat: FlatRow[] = [];
  for (const campaign of campaignRows) {
    flat.push({ type: "campaign", row: campaign });
    if (!expanded.has(campaign.id)) continue;
    for (const adSet of campaign.adSets) {
      flat.push({ type: "adset", row: adSet });
      if (!expanded.has(adSet.id)) continue;
      for (const ad of adSet.ads) flat.push({ type: "ad", row: ad });
    }
  }
  return flat;
}

/** The aria-sort value for a header cell, so assistive tech hears the same direction the arrow shows. */
function ariaSort(sort: SortState | null, key: SortKey): "ascending" | "descending" | "none" {
  if (sort?.key !== key) return "none";
  return sort.direction === "asc" ? "ascending" : "descending";
}

interface SortButtonProps {
  label: string;
  sortKey: SortKey;
  sort: SortState | null;
  onSort: (key: SortKey) => void;
}

/** The clickable part of a header cell. The cell itself (and its aria-sort) belongs to the caller. */
function SortButton({ label, sortKey, sort, onSort }: SortButtonProps) {
  const direction = sort?.key === sortKey ? sort.direction : null;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className="inline-flex items-center gap-1 whitespace-nowrap transition-colors hover:text-foreground"
    >
      {label}
      {direction === "asc" && <ArrowUp className="size-3" />}
      {direction === "desc" && <ArrowDown className="size-3" />}
      {!direction && <ArrowUpDown className="size-3 opacity-40" />}
    </button>
  );
}

interface PerformanceTableProps {
  /** Already filtered and sorted by the page. */
  rows: CampaignRow[];
  sort: SortState | null;
  onSort: (key: SortKey) => void;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  hasExpandableRows: boolean;
}

export function PerformanceTable({
  rows,
  sort,
  onSort,
  expandedIds,
  onToggleExpand,
  onExpandAll,
  onCollapseAll,
  hasExpandableRows,
}: PerformanceTableProps) {
  const columns = useDashboardColumns();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const flatRows = useMemo(() => flattenRows(rows, expandedIds), [rows, expandedIds]);
  const visibleColumns = columns.visibleColumns;

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-primary">
            היררכיית ביצועים <span className="font-normal text-muted-foreground">(Campaign → Ad Set → Ad)</span>
          </h2>
          <p className="text-xs text-muted-foreground">שורה אחת לכל קמפיין. פתחו קמפיין כדי לראות את סדרות המודעות שלו, ופתחו סדרה כדי לראות את המודעות.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onExpandAll} disabled={!hasExpandableRows}>
            הרחב הכול
          </Button>
          <Button variant="outline" size="sm" onClick={onCollapseAll} disabled={!hasExpandableRows}>
            סגור הכול
          </Button>
          <ColumnVisibilityMenu
            orderedColumns={columns.orderedColumns}
            visibleKeys={columns.visibleKeys}
            toggleColumn={columns.toggleColumn}
            moveColumn={columns.moveColumn}
            reset={columns.reset}
            hasCustomLayout={columns.hasCustomLayout}
          />
        </div>
      </div>

      <TableTopScrollbar targetRef={tableContainerRef} />
      <Table ref={tableContainerRef}>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="sticky right-0 z-10 min-w-64 border-l border-border bg-card" aria-sort={ariaSort(sort, "name")}>
              <SortButton label="שם (Name)" sortKey="name" sort={sort} onSort={onSort} />
            </TableHead>
            <TableHead className="min-w-24" aria-sort={ariaSort(sort, "status")}>
              <SortButton label="סטטוס (Status)" sortKey="status" sort={sort} onSort={onSort} />
            </TableHead>
            {visibleColumns.map((column) => (
              <TableHead
                key={column.key}
                className={cn("text-left", column.highlight && "font-semibold text-foreground")}
                aria-sort={ariaSort(sort, column.key)}
              >
                <SortButton label={column.label} sortKey={column.key} sort={sort} onSort={onSort} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {flatRows.map((flat) => (
            <HierarchyRow
              key={flat.row.id}
              flat={flat}
              isExpanded={flat.type !== "ad" && expandedIds.has(flat.row.id)}
              onToggleExpand={onToggleExpand}
              visibleColumns={visibleColumns}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface HierarchyRowProps {
  flat: FlatRow;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  visibleColumns: PerformanceColumnDef[];
}

function HierarchyRow({ flat, isExpanded, onToggleExpand, visibleColumns }: HierarchyRowProps) {
  const row = flat.row;
  const isExpandable = flat.type !== "ad" && hasChildren(flat);
  const depth = flat.type === "campaign" ? 0 : flat.type === "adset" ? 1 : 2;
  const Icon = flat.type === "campaign" ? Megaphone : flat.type === "adset" ? Layers3 : ImageIcon;
  const isUnassigned = row.isUnassigned;

  return (
    <TableRow
      data-level={flat.type}
      data-row-id={row.id}
      className={cn(
        "group",
        flat.type === "adset" && "bg-muted/30",
        isUnassigned && "text-muted-foreground italic"
      )}
    >
      <TableCell
        className={cn(
          "sticky right-0 z-10 border-l border-border group-hover:bg-muted/40",
          flat.type === "campaign" ? "bg-card font-semibold" : flat.type === "adset" ? "bg-muted/30 font-medium" : "bg-card",
          flat.type === "campaign" && "border-r-2 border-r-primary/60"
        )}
        style={{ paddingInlineStart: `${depth * 22 + 12}px` }}
      >
        <div className="flex min-w-0 items-center gap-2">
          {isExpandable ? (
            <button
              type="button"
              onClick={() => onToggleExpand(row.id)}
              className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label={isExpanded ? "כיווץ שורה" : "הרחבת שורה"}
              aria-expanded={isExpanded}
            >
              <ChevronDown className={cn("size-3.5 transition-transform", !isExpanded && "-rotate-90")} />
            </button>
          ) : (
            <span className="size-5 shrink-0" />
          )}
          <Icon className={cn("size-3.5 shrink-0", flat.type === "campaign" ? "text-primary" : "text-muted-foreground")} />
          <span className="truncate">{row.name}</span>
          {flat.type === "ad" && !isUnassigned && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                  {LEAD_SOURCE_LABELS[flat.row.destinationType].short}
                </span>
              </TooltipTrigger>
              <TooltipContent>{LEAD_SOURCE_LABELS[flat.row.destinationType].full}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </TableCell>
      <TableCell>{isUnassigned ? <span className="text-muted-foreground">—</span> : <StatusBadge status={row.status} />}</TableCell>
      {visibleColumns.map((column) => {
        const display = cellDisplay(row, column);
        return (
          <TableCell
            key={column.key}
            className={cn(
              "text-left tabular-nums-he",
              column.highlight && display.state === "value" ? "font-semibold text-foreground" : "text-muted-foreground",
              display.state !== "value" && "text-muted-foreground/70"
            )}
          >
            <span className="inline-flex items-center justify-end gap-1.5">
              {display.text}
              {display.partial && (
                <span className="text-[10px] font-medium text-warning-foreground" title="חלק מהלידים בלי סטטוס">
                  חלקי
                </span>
              )}
              {column.key === "cpl" && display.state === "value" && <CplTierBadge cpl={row.metrics.cpl} />}
            </span>
          </TableCell>
        );
      })}
    </TableRow>
  );
}

function hasChildren(flat: FlatRow): boolean {
  if (flat.type === "campaign") return flat.row.adSets.length > 0;
  if (flat.type === "adset") return flat.row.ads.length > 0;
  return false;
}
