"use client";

import { useRef } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { LeadRow } from "@/components/leads/lead-row";
import { columnStyle, LEAD_COLUMN_LABELS, type LeadColumnKey, stickyRightOffsets } from "@/components/leads/lead-columns";
import type { LeadColumnLayoutState } from "@/components/leads/use-lead-column-layout";
import type { LeadStatusPatch } from "@/components/leads/use-lead-status-editor";
import { ColumnResizeHandle } from "@/components/shared/column-resize-handle";
import { TableBottomScrollbar, TableTopScrollbar } from "@/components/shared/table-top-scrollbar";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { MetaFormLead } from "@/lib/leads";
import { defaultLeadStatusRecord, type LeadStatusRecord } from "@/lib/lead-status/types";
import { cn } from "@/lib/utils";

interface LeadsTableProps {
  leads: MetaFormLead[];
  statusesByLeadId: Map<string, LeadStatusRecord>;
  onSaveStatus: (leadId: string, patch: LeadStatusPatch) => Promise<LeadStatusRecord>;
  onStatusSaved: (record: LeadStatusRecord) => void;
  columnLayout: LeadColumnLayoutState;
  /** The single currently-active sort column, and its direction - "desc" for leadDate means newest first (the page's default). Sorts whatever's already loaded/filtered - never triggers a new fetch. */
  sortKey: LeadColumnKey;
  sortDirection: "asc" | "desc";
  onSort: (key: LeadColumnKey) => void;
}

/** Shared sticky classes (lg+ only - see lead-columns.ts) so header and body cells line up exactly. */
const STICKY_CELL_CLASS = "lg:sticky lg:z-10 lg:bg-card";
/** Headers wrap to 2 lines instead of forcing the column wider than its data needs (see lead-columns.ts doc comment on why column width must stay authoritative under table-fixed). */
const HEADER_TEXT_CLASS = "relative whitespace-normal py-2 leading-tight";

export function LeadsTable({ leads, statusesByLeadId, onSaveStatus, onStatusSaved, columnLayout, sortKey, sortDirection, onSort }: LeadsTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { widths, resizeColumn, visibleColumnOrder } = columnLayout;
  const rightOffsets = stickyRightOffsets(widths);
  const SortIcon = sortDirection === "desc" ? ArrowDown : ArrowUp;

  /** Every column header is clickable and sortable (see lead-sort.ts) - only the currently-active column shows the ↑/↓ indicator. */
  function head(key: LeadColumnKey, extraClassName?: string) {
    const isSticky = rightOffsets[key] !== undefined;
    const isActive = sortKey === key;
    return (
      <TableHead
        key={key}
        className={cn(HEADER_TEXT_CLASS, isSticky && STICKY_CELL_CLASS, extraClassName)}
        style={columnStyle(widths[key], rightOffsets[key])}
        aria-sort={isActive ? (sortDirection === "desc" ? "descending" : "ascending") : undefined}
      >
        <button
          type="button"
          onClick={() => onSort(key)}
          className="flex items-center gap-1 text-right hover:text-foreground"
          title={
            isActive
              ? sortDirection === "desc"
                ? "מיון: מהגבוה/חדש לנמוך/ישן - לחצו למיון הפוך"
                : "מיון: מהנמוך/ישן לגבוה/חדש - לחצו למיון הפוך"
              : `מיון לפי ${LEAD_COLUMN_LABELS[key]}`
          }
        >
          <span>{LEAD_COLUMN_LABELS[key]}</span>
          {isActive && <SortIcon className="size-3.5 shrink-0" />}
        </button>
        <ColumnResizeHandle label={LEAD_COLUMN_LABELS[key]} onResize={(delta) => resizeColumn(key, delta)} />
      </TableHead>
    );
  }

  const isTechnicalIdColumn = (key: LeadColumnKey) => key === "campaignId" || key === "adSetId" || key === "adId";

  return (
    <div className="rounded-xl border border-border bg-card">
      <TableTopScrollbar targetRef={tableContainerRef} />
      <Table ref={tableContainerRef} className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {head("leadDate", "border-l border-transparent lg:border-border")}
            {head("name")}
            {head("phone")}
            {head("mainStatus")}
            {head("secondaryStatus", "border-l border-border")}
            {head("fullPayment")}
            {head("partialPayment")}
            {visibleColumnOrder
              .filter((key) => key !== "leadDate" && key !== "name" && key !== "phone" && key !== "mainStatus" && key !== "secondaryStatus" && key !== "fullPayment" && key !== "partialPayment")
              .map((key) => head(key, isTechnicalIdColumn(key) || key === "leadId" ? "text-left font-mono text-[11px]" : undefined))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <LeadRow
              key={lead.id}
              lead={lead}
              statusRecord={statusesByLeadId.get(lead.id) ?? defaultLeadStatusRecord(lead.id, lead.normalizedPhone)}
              onSaveStatus={onSaveStatus}
              onStatusSaved={onStatusSaved}
              widths={widths}
              rightOffsets={rightOffsets}
              visibleColumnOrder={visibleColumnOrder}
            />
          ))}
        </TableBody>
      </Table>
      <TableBottomScrollbar targetRef={tableContainerRef} />
    </div>
  );
}
