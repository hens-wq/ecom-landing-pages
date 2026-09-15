"use client";

import { useRef, type CSSProperties } from "react";

import { LeadRow } from "@/components/leads/lead-row";
import { stickyColumnStyle } from "@/components/leads/sticky-columns";
import type { LeadStatusPatch } from "@/components/leads/use-lead-status-editor";
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
}

/** Shared sticky classes (lg+ only - see sticky-columns.ts) so header and body cells line up exactly. */
const STICKY_CELL_CLASS = "lg:sticky lg:z-10 lg:bg-card";
/** Headers wrap to 2 lines instead of forcing the column wider than its data needs (see sticky-columns.ts doc comment on why column width must stay authoritative under table-fixed). */
const HEADER_TEXT_CLASS = "whitespace-normal leading-tight py-2";
/** Fits the w-28 (112px) amount input from payment-inputs.tsx plus the cell's px-3 padding. */
const PAYMENT_COLUMN_WIDTH: CSSProperties = { width: 140, minWidth: 140 };

export function LeadsTable({ leads, statusesByLeadId, onSaveStatus, onStatusSaved }: LeadsTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="rounded-xl border border-border bg-card">
      <TableTopScrollbar targetRef={tableContainerRef} />
      <Table ref={tableContainerRef} className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead
              className={cn(STICKY_CELL_CLASS, HEADER_TEXT_CLASS, "border-l border-transparent lg:border-border")}
              style={stickyColumnStyle("leadDate")}
            >
              תאריך כניסת ליד (Lead Date)
            </TableHead>
            <TableHead className={cn(STICKY_CELL_CLASS, HEADER_TEXT_CLASS)} style={stickyColumnStyle("name")}>
              שם (Name)
            </TableHead>
            <TableHead className={cn(STICKY_CELL_CLASS, HEADER_TEXT_CLASS)} style={stickyColumnStyle("phone")}>
              טלפון (Phone)
            </TableHead>
            <TableHead className={cn(STICKY_CELL_CLASS, HEADER_TEXT_CLASS)} style={stickyColumnStyle("mainStatus")}>
              סטטוס ראשי (Main Status)
            </TableHead>
            <TableHead
              className={cn(STICKY_CELL_CLASS, HEADER_TEXT_CLASS, "border-l border-border")}
              style={stickyColumnStyle("secondaryStatus")}
            >
              סטטוס משני (Secondary Status)
            </TableHead>
            <TableHead className={HEADER_TEXT_CLASS} style={PAYMENT_COLUMN_WIDTH}>
              תשלום מלא (Full Payment)
            </TableHead>
            <TableHead className={HEADER_TEXT_CLASS} style={PAYMENT_COLUMN_WIDTH}>
              תשלום חלקי (Partial Payment)
            </TableHead>
            <TableHead className={HEADER_TEXT_CLASS} style={{ width: 110, minWidth: 110 }}>
              מקור ליד (Lead Source)
            </TableHead>
            <TableHead className={HEADER_TEXT_CLASS} style={{ width: 160, minWidth: 160 }}>
              קמפיין (Campaign)
            </TableHead>
            <TableHead className={HEADER_TEXT_CLASS} style={{ width: 160, minWidth: 160 }}>
              סדרת מודעות (Ad Set)
            </TableHead>
            <TableHead className={HEADER_TEXT_CLASS} style={{ width: 160, minWidth: 160 }}>
              מודעה (Ad)
            </TableHead>
            <TableHead
              className={cn(HEADER_TEXT_CLASS, "text-left font-mono text-[11px]")}
              style={{ width: 150, minWidth: 150 }}
            >
              מזהה ליד (Lead ID)
            </TableHead>
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
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
