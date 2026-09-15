import { LeadRow } from "@/components/leads/lead-row";
import type { LeadStatusPatch } from "@/components/leads/use-lead-status-editor";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { MetaFormLead } from "@/lib/leads";
import { defaultLeadStatusRecord, type LeadStatusRecord } from "@/lib/lead-status/types";

interface LeadsTableProps {
  leads: MetaFormLead[];
  statusesByLeadId: Map<string, LeadStatusRecord>;
  onSaveStatus: (leadId: string, patch: LeadStatusPatch) => Promise<LeadStatusRecord>;
  onStatusSaved: (record: LeadStatusRecord) => void;
}

export function LeadsTable({ leads, statusesByLeadId, onSaveStatus, onStatusSaved }: LeadsTableProps) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="sticky right-0 z-10 min-w-36 border-l border-border bg-card">
              תאריך כניסת ליד (Lead Date)
            </TableHead>
            <TableHead className="min-w-36">שם (Name)</TableHead>
            <TableHead className="min-w-32">טלפון (Phone)</TableHead>
            <TableHead className="min-w-32">מקור ליד (Lead Source)</TableHead>
            <TableHead className="min-w-44">קמפיין (Campaign)</TableHead>
            <TableHead className="min-w-44">סדרת מודעות (Ad Set)</TableHead>
            <TableHead className="min-w-44">מודעה (Ad)</TableHead>
            <TableHead className="min-w-40">סטטוס (Status)</TableHead>
            <TableHead className="min-w-32">תשלום (Payment)</TableHead>
            <TableHead className="min-w-40 text-left font-mono text-[11px]">מזהה ליד (Lead ID)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <LeadRow
              key={lead.id}
              lead={lead}
              statusRecord={statusesByLeadId.get(lead.id) ?? defaultLeadStatusRecord(lead.id, lead.phone)}
              onSaveStatus={onSaveStatus}
              onStatusSaved={onStatusSaved}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
