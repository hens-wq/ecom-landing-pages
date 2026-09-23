"use client";

import { useRef } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { LeadRow } from "@/components/leads/lead-row";
import { columnStyle, type LeadColumnKey, stickyRightOffsets } from "@/components/leads/lead-columns";
import type { LeadColumnWidthsState } from "@/components/leads/use-lead-column-widths";
import type { LeadStatusPatch } from "@/components/leads/use-lead-status-editor";
import { ColumnResizeHandle } from "@/components/shared/column-resize-handle";
import { TableTopScrollbar } from "@/components/shared/table-top-scrollbar";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { MetaFormLead } from "@/lib/leads";
import { defaultLeadStatusRecord, type LeadStatusRecord } from "@/lib/lead-status/types";
import { cn } from "@/lib/utils";

interface LeadsTableProps {
  leads: MetaFormLead[];
  statusesByLeadId: Map<string, LeadStatusRecord>;
  onSaveStatus: (leadId: string, patch: LeadStatusPatch) => Promise<LeadStatusRecord>;
  onStatusSaved: (record: LeadStatusRecord) => void;
  columnWidths: LeadColumnWidthsState;
  /** "desc" = newest first (the default - see app/leads/page.tsx), "asc" = oldest first. Sorts whatever's already loaded/filtered - never triggers a new fetch. */
  sortOrder: "asc" | "desc";
  onToggleSort: () => void;
}

/** Shared sticky classes (lg+ only - see lead-columns.ts) so header and body cells line up exactly. */
const STICKY_CELL_CLASS = "lg:sticky lg:z-10 lg:bg-card";
/** Headers wrap to 2 lines instead of forcing the column wider than its data needs (see lead-columns.ts doc comment on why column width must stay authoritative under table-fixed). */
const HEADER_TEXT_CLASS = "relative whitespace-normal py-2 leading-tight";

const HEADER_LABELS: Record<LeadColumnKey, string> = {
  leadDate: "תאריך כניסת ליד (Lead Date)",
  name: "שם (Name)",
  phone: "טלפון (Phone)",
  mainStatus: "סטטוס ראשי (Main Status)",
  secondaryStatus: "סטטוס משני (Secondary Status)",
  fullPayment: "תשלום מלא (Full Payment)",
  partialPayment: "תשלום חלקי (Partial Payment)",
  leadSource: "מקור ליד (Lead Source)",
  campaign: "קמפיין (Campaign)",
  adSet: "סדרת מודעות (Ad Set)",
  ad: "מודעה (Ad)",
  leadId: "מזהה ליד (Lead ID)",
};

export function LeadsTable({ leads, statusesByLeadId, onSaveStatus, onStatusSaved, columnWidths, sortOrder, onToggleSort }: LeadsTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { widths, resizeColumn } = columnWidths;
  const rightOffsets = stickyRightOffsets(widths);

  function head(key: LeadColumnKey, extraClassName?: string) {
    const isSticky = rightOffsets[key] !== undefined;
    return (
      <TableHead
        className={cn(HEADER_TEXT_CLASS, isSticky && STICKY_CELL_CLASS, extraClassName)}
        style={columnStyle(widths[key], rightOffsets[key])}
      >
        {HEADER_LABELS[key]}
        <ColumnResizeHandle label={HEADER_LABELS[key]} onResize={(delta) => resizeColumn(key, delta)} />
      </TableHead>
    );
  }

  const isLeadDateSticky = rightOffsets.leadDate !== undefined;
  const SortIcon = sortOrder === "desc" ? ArrowDown : ArrowUp;

  return (
    <div className="rounded-xl border border-border bg-card">
      <TableTopScrollbar targetRef={tableContainerRef} />
      <Table ref={tableContainerRef} className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead
              className={cn(HEADER_TEXT_CLASS, isLeadDateSticky && STICKY_CELL_CLASS, "border-l border-transparent lg:border-border")}
              style={columnStyle(widths.leadDate, rightOffsets.leadDate)}
              aria-sort={sortOrder === "desc" ? "descending" : "ascending"}
            >
              <button
                type="button"
                onClick={onToggleSort}
                className="flex items-center gap-1 text-right hover:text-foreground"
                title={sortOrder === "desc" ? "מיון: החדש ביותר קודם - לחצו למיון הפוך" : "מיון: הישן ביותר קודם - לחצו למיון הפוך"}
              >
                <span>{HEADER_LABELS.leadDate}</span>
                <SortIcon className="size-3.5 shrink-0" />
              </button>
              <ColumnResizeHandle label={HEADER_LABELS.leadDate} onResize={(delta) => resizeColumn("leadDate", delta)} />
            </TableHead>
            {head("name")}
            {head("phone")}
            {head("mainStatus")}
            {head("secondaryStatus", "border-l border-border")}
            {head("fullPayment")}
            {head("partialPayment")}
            {head("leadSource")}
            {head("campaign")}
            {head("adSet")}
            {head("ad")}
            {head("leadId", "text-left font-mono text-[11px]")}
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
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

