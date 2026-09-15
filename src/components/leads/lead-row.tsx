import { AlertTriangle, Loader2 } from "lucide-react";

import { PaymentInputs } from "@/components/leads/payment-inputs";
import { StatusSelect } from "@/components/leads/status-select";
import { useLeadStatusEditor, type LeadStatusPatch } from "@/components/leads/use-lead-status-editor";
import { TableCell, TableRow } from "@/components/ui/table";
import { LEAD_SOURCE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import type { MetaFormLead } from "@/lib/leads";
import type { LeadStatusRecord } from "@/lib/lead-status/types";
import { formatPhoneDisplay } from "@/lib/phone";

interface LeadRowProps {
  lead: MetaFormLead;
  statusRecord: LeadStatusRecord;
  onSaveStatus: (leadId: string, patch: LeadStatusPatch) => Promise<LeadStatusRecord>;
  onStatusSaved: (record: LeadStatusRecord) => void;
}

export function LeadRow({ lead, statusRecord, onSaveStatus, onStatusSaved }: LeadRowProps) {
  const editor = useLeadStatusEditor(statusRecord, async (patch) => {
    const saved = await onSaveStatus(lead.id, { ...patch, phone: lead.phone });
    onStatusSaved(saved);
    return saved;
  });

  return (
    <TableRow>
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

      <TableCell className="min-w-40 align-top">
        <StatusSelect
          mainStatus={editor.mainStatus}
          secondaryStatus={editor.secondaryStatus}
          disabled={editor.pending}
          onMainStatusChange={editor.changeMainStatus}
          onSecondaryStatusChange={editor.changeSecondaryStatus}
        />
        {editor.pending && (
          <span className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
            <Loader2 className="size-2.5 animate-spin" /> שומר...
          </span>
        )}
        {editor.awaitingAmount && !editor.pending && (
          <span className="mt-1 flex items-center gap-1 text-[10px] text-warning-foreground">
            <AlertTriangle className="size-2.5" /> יש להזין סכום
          </span>
        )}
        {editor.error && <span className="mt-1 block text-[10px] text-destructive">{editor.error}</span>}
      </TableCell>

      <TableCell className="min-w-32 align-top">
        <PaymentInputs
          mainStatus={editor.mainStatus}
          secondaryStatus={editor.secondaryStatus}
          fullPaymentAmount={editor.fullPaymentAmount}
          partialPaymentAmount={editor.partialPaymentAmount}
          disabled={editor.pending}
          onFullPaymentChange={editor.changeFullPayment}
          onPartialPaymentChange={editor.changePartialPayment}
        />
      </TableCell>

      <TableCell className="text-left font-mono text-[11px] text-muted-foreground/70" dir="ltr">
        {lead.id}
      </TableCell>
    </TableRow>
  );
}
