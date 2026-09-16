import { AlertTriangle, Loader2 } from "lucide-react";

import { columnStyle, type LeadColumnKey } from "@/components/leads/lead-columns";
import { FullPaymentField, PartialPaymentField } from "@/components/leads/payment-inputs";
import { MainStatusSelect, SecondaryStatusSelect } from "@/components/leads/status-select";
import { useLeadStatusEditor, type LeadStatusPatch } from "@/components/leads/use-lead-status-editor";
import { TableCell, TableRow } from "@/components/ui/table";
import { LEAD_SOURCE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { MetaFormLead } from "@/lib/leads";
import type { LeadStatusRecord } from "@/lib/lead-status/types";
import { formatPhoneDisplay } from "@/lib/phone";
import { cn } from "@/lib/utils";

interface LeadRowProps {
  lead: MetaFormLead;
  statusRecord: LeadStatusRecord;
  onSaveStatus: (leadId: string, patch: LeadStatusPatch) => Promise<LeadStatusRecord>;
  onStatusSaved: (record: LeadStatusRecord) => void;
  /** Same live widths map the header's resize handles write to (see leads-table.tsx) - never a separate snapshot, so a resized column can never drift out of sync between header and body cells. */
  widths: Record<LeadColumnKey, number>;
  rightOffsets: Partial<Record<LeadColumnKey, number>>;
}

const STICKY_CELL_CLASS = "lg:sticky lg:z-10 lg:bg-card group-hover:lg:bg-muted/40";

export function LeadRow({ lead, statusRecord, onSaveStatus, onStatusSaved, widths, rightOffsets }: LeadRowProps) {
  const editor = useLeadStatusEditor(statusRecord, async (patch) => {
    const saved = await onSaveStatus(lead.id, { ...patch, normalizedPhone: lead.normalizedPhone });
    onStatusSaved(saved);
    return saved;
  });

  const isRegistered = editor.mainStatus === "נרשם";
  const fullActive = isRegistered && editor.secondaryStatus === "תשלום מלא";
  const partialActive = isRegistered && editor.secondaryStatus === "תשלום חלקי";

  return (
    <TableRow className="group">
      <TableCell
        className={cn(STICKY_CELL_CLASS, "border-l border-transparent lg:border-border tabular-nums-he")}
        style={columnStyle(widths.leadDate, rightOffsets.leadDate)}
      >
        {formatDateTime(lead.createdTime)}
      </TableCell>
      <TableCell
        className={cn(STICKY_CELL_CLASS, "overflow-hidden font-medium text-ellipsis")}
        style={columnStyle(widths.name, rightOffsets.name)}
        title={lead.name ?? undefined}
      >
        {lead.name ?? "-"}
      </TableCell>
      <TableCell
        className={cn(STICKY_CELL_CLASS, "tabular-nums-he text-muted-foreground")}
        style={columnStyle(widths.phone, rightOffsets.phone)}
        dir="ltr"
      >
        {lead.phone ? formatPhoneDisplay(lead.phone) : "-"}
      </TableCell>

      <TableCell className={cn(STICKY_CELL_CLASS, "align-top")} style={columnStyle(widths.mainStatus, rightOffsets.mainStatus)}>
        <MainStatusSelect mainStatus={editor.mainStatus} disabled={editor.pending} onChange={editor.changeMainStatus} />
        {editor.pending && (
          <span className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
            <Loader2 className="size-2.5 animate-spin" /> שומר...
          </span>
        )}
        {editor.error && <span className="mt-1 block text-[10px] text-destructive">{editor.error}</span>}
      </TableCell>
      <TableCell
        className={cn(STICKY_CELL_CLASS, "border-l border-border align-top")}
        style={columnStyle(widths.secondaryStatus, rightOffsets.secondaryStatus)}
      >
        <SecondaryStatusSelect
          mainStatus={editor.mainStatus}
          secondaryStatus={editor.secondaryStatus}
          disabled={editor.pending}
          onChange={editor.changeSecondaryStatus}
        />
        {editor.awaitingAmount && !editor.pending && (
          <span className="mt-1 flex items-center gap-1 text-[10px] text-warning-foreground">
            <AlertTriangle className="size-2.5" /> יש להזין סכום
          </span>
        )}
      </TableCell>

      <TableCell className="align-top" style={columnStyle(widths.fullPayment)}>
        <FullPaymentField
          isActive={fullActive}
          value={editor.fullPaymentAmount}
          disabled={editor.pending}
          onChange={editor.changeFullPayment}
        />
      </TableCell>
      <TableCell className="align-top" style={columnStyle(widths.partialPayment)}>
        <PartialPaymentField
          isActive={partialActive}
          value={editor.partialPaymentAmount}
          disabled={editor.pending}
          onChange={editor.changePartialPayment}
        />
      </TableCell>

      <TableCell className="overflow-hidden text-ellipsis text-muted-foreground" style={columnStyle(widths.leadSource)}>
        {LEAD_SOURCE_LABELS[lead.sourceType].short}
      </TableCell>
      <TableCell
        className="overflow-hidden text-ellipsis text-muted-foreground"
        style={columnStyle(widths.campaign)}
        title={lead.campaignName || undefined}
      >
        {lead.campaignName || "-"}
      </TableCell>
      <TableCell
        className="overflow-hidden text-ellipsis text-muted-foreground"
        style={columnStyle(widths.adSet)}
        title={lead.adSetName || undefined}
      >
        {lead.adSetName || "-"}
      </TableCell>
      <TableCell
        className="overflow-hidden text-ellipsis text-muted-foreground"
        style={columnStyle(widths.ad)}
        title={lead.adName || undefined}
      >
        {lead.adName || "-"}
      </TableCell>
      <TableCell
        className="overflow-hidden text-left font-mono text-[11px] text-ellipsis text-muted-foreground/70"
        style={columnStyle(widths.leadId)}
        dir="ltr"
        title={lead.id}
      >
        {lead.id}
      </TableCell>
    </TableRow>
  );
}
