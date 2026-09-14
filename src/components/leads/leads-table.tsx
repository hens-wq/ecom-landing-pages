import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LEAD_SOURCE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { formatPhoneDisplay } from "@/lib/phone";
import type { MetaFormLead } from "@/lib/leads";

export function LeadsTable({ leads }: { leads: MetaFormLead[] }) {
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
            <TableHead className="min-w-40 text-left font-mono text-[11px]">מזהה ליד (Lead ID)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell className="sticky right-0 z-10 border-l border-border bg-card tabular-nums-he">
                {formatDateTime(lead.createdTime)}
              </TableCell>
              <TableCell className="font-medium">{lead.name ?? "-"}</TableCell>
              <TableCell className="tabular-nums-he text-muted-foreground" dir="ltr">
                {lead.phone ? formatPhoneDisplay(lead.phone) : "-"}
              </TableCell>
              <TableCell className="text-muted-foreground">{LEAD_SOURCE_LABELS[lead.sourceType].short}</TableCell>
              <TableCell className="text-muted-foreground">{lead.campaignName || "-"}</TableCell>
              <TableCell className="text-muted-foreground">{lead.adSetName || "-"}</TableCell>
              <TableCell className="text-muted-foreground">{lead.adName || "-"}</TableCell>
              <TableCell className="text-left font-mono text-[11px] text-muted-foreground/70" dir="ltr">
                {lead.id}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
