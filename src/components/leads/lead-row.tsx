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
  /** The configurable columns currently visible, in their current order - the anchored cluster (Lead Date..Payments) is always rendered first regardless, see below. */
  visibleColumnOrder: LeadColumnKey[];
}

const STICKY_CELL_CLASS = "lg:sticky lg:z-10 lg:bg-card group-hover:lg:bg-muted/40";
const TECH_ID_CLASS = "overflow-hidden text-left font-mono text-[11px] text-ellipsis text-muted-foreground/70";
const CONFIGURABLE_KEYS_SET = new Set<LeadColumnKey>([
  "leadSource",
  "campaign",
  "adSet",
  "ad",
  "leadId",
  "campaignId",
  "adSetId",
  "adId",
  "outcome",
]);

export function LeadRow({ lead, statusRecord, onSaveStatus, onStatusSaved, widths, rightOffsets, visibleColumnOrder }: LeadRowProps) {
  const editor = useLeadStatusEditor(statusRecord, async (patch) => {
    const saved = await onSaveStatus(lead.id, { ...patch, normalizedPhone: lead.normalizedPhone });
    onStatusSaved(saved);
    return saved;
  });

  const isRegistered = editor.mainStatus === "נרשם";
  const fullActive = isRegistered && editor.secondaryStatus === "תשלום מלא";
  const partialActive = isRegistered && editor.secondaryStatus === "תשלום חלקי";

  /**
   * Meta Lead ID is only meaningful for leads that actually came through a
   * Meta Instant Form - a landing-page lead's `id` is this app's own
   * internal_lead_id (a UUID used to key its lead_status row, same as any
   * other lead), never a real Meta Lead ID, so it must never be displayed
   * as one here (see lib/landing-leads/types.ts: meta_lead_id is null for
   * these rows in Neon too).
   */
  const metaLeadId = lead.sourceType === "landing_page" ? null : lead.id;

  function renderConfigurableCell(key: LeadColumnKey) {
    switch (key) {
      case "leadSource":
        return (
          <TableCell key={key} className="overflow-hidden text-ellipsis text-muted-foreground" style={columnStyle(widths.leadSource)}>
            {LEAD_SOURCE_LABELS[lead.sourceType].short}
          </TableCell>
        );
      case "campaign":
        return (
          <TableCell
            key={key}
            className="overflow-hidden text-ellipsis text-muted-foreground"
            style={columnStyle(widths.campaign)}
            title={lead.campaignName || undefined}
          >
            {lead.campaignName || "-"}
          </TableCell>
        );
      case "adSet":
        return (
          <TableCell
            key={key}
            className="overflow-hidden text-ellipsis text-muted-foreground"
            style={columnStyle(widths.adSet)}
            title={lead.adSetName || undefined}
          >
            {lead.adSetName || "-"}
          </TableCell>
        );
      case "ad":
        return (
          <TableCell
            key={key}
            className="overflow-hidden text-ellipsis text-muted-foreground"
            style={columnStyle(widths.ad)}
            title={lead.adName || undefined}
          >
            {lead.adName || "-"}
          </TableCell>
        );
      case "leadId":
        return (
          <TableCell key={key} className={TECH_ID_CLASS} style={columnStyle(widths.leadId)} dir="ltr" title={metaLeadId ?? undefined}>
            {metaLeadId ?? "-"}
          </TableCell>
        );
      case "campaignId":
        return (
          <TableCell key={key} className={TECH_ID_CLASS} style={columnStyle(widths.campaignId)} dir="ltr" title={lead.campaignId || undefined}>
            {lead.campaignId || "-"}
          </TableCell>
        );
      case "adSetId":
        return (
          <TableCell key={key} className={TECH_ID_CLASS} style={columnStyle(widths.adSetId)} dir="ltr" title={lead.adSetId || undefined}>
            {lead.adSetId || "-"}
          </TableCell>
        );
      case "adId":
        return (
          <TableCell key={key} className={TECH_ID_CLASS} style={columnStyle(widths.adId)} dir="ltr" title={lead.adId || undefined}>
            {lead.adId || "-"}
          </TableCell>
        );
      case "outcome":
        // Read-only, deliberately never its own editable control - always
        // mirrors the SAME live secondaryStatus value the dropdown above
        // shows (including a staged, not-yet-saved selection), so it can
        // never disagree with Secondary Status even for a moment.
        return (
          <TableCell key={key} className="overflow-hidden text-ellipsis text-muted-foreground" style={columnStyle(widths.outcome)} title={editor.secondaryStatus || undefined}>
            {editor.secondaryStatus || ""}
          </TableCell>
        );
      default:
        return null;
    }
  }

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

      {visibleColumnOrder.filter((key) => CONFIGURABLE_KEYS_SET.has(key)).map(renderConfigurableCell)}
    </TableRow>
  );
}
