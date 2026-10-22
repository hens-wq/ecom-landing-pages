"use client";

import { useState } from "react";
import { ChevronDown, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatLeadDateDisplay, type MissingPaymentLead } from "@/lib/lead-status/missing-payment";
import { cn } from "@/lib/utils";

interface MissingPaymentBannerProps {
  /** Every enrolled lead still missing a payment amount, across all dates. */
  leads: MissingPaymentLead[];
  metaAvailable: boolean;
  isFilterActive: boolean;
  /** Shows every missing lead, widening the date range if needed. */
  onActivateAll: () => void;
  /** Shows every missing lead and brings this one into view. */
  onActivateLead: (leadId: string) => void;
  onClear: () => void;
}

function headline(count: number): string {
  return count === 1 ? "⚠ יש 1 נרשם שעדיין חסר לו סכום תשלום" : `⚠ יש ${count} נרשמים שעדיין חסר להם סכום תשלום`;
}

/** Red alert above the Leads page. Click the message to see every missing lead; click one lead in the list to go straight to it. */
export function MissingPaymentBanner({ leads, metaAvailable, isFilterActive, onActivateAll, onActivateLead, onClear }: MissingPaymentBannerProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  if (leads.length === 0) return null;

  return (
    <div role="alert" className="flex flex-col gap-2 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-destructive">
      <div className="flex flex-wrap items-center gap-2">
        {isFilterActive ? (
          <span className="flex-1 font-semibold">{headline(leads.length)} - מוצגים כעת</span>
        ) : (
          <button type="button" onClick={onActivateAll} className="flex-1 text-right font-semibold hover:underline">
            {headline(leads.length)}
            <span className="mr-2 text-xs font-normal opacity-80">(לחצו להצגה)</span>
          </button>
        )}
        <Button variant="outline" size="sm" onClick={() => setIsDetailOpen((open) => !open)} aria-expanded={isDetailOpen} className="gap-1 border-destructive/50 bg-background">
          פירוט
          <ChevronDown className={cn("size-3.5 transition-transform", isDetailOpen && "rotate-180")} />
        </Button>
        {isFilterActive && (
          <Button variant="outline" size="sm" onClick={onClear} className="gap-1 border-destructive/50 bg-background">
            <X className="size-3.5" />
            נקה סינון
          </Button>
        )}
      </div>

      {isDetailOpen && (
        <ul className="flex flex-col gap-1 border-t border-destructive/30 pt-2 text-sm">
          {leads.map((lead) => {
            const text = lead.found
              ? `⚠ חסר סכום תשלום: ${lead.name ?? "ללא שם"} | ${lead.phone ?? "-"} | ${lead.leadDate ? formatLeadDateDisplay(lead.leadDate) : "-"}`
              : `⚠ רשומת סטטוס ללא ליד מתאים בדשבורד (מזהה: ${lead.leadId})`;
            return (
              <li key={lead.leadId}>
                {lead.found ? (
                  <button type="button" onClick={() => onActivateLead(lead.leadId)} className="text-right hover:underline" dir="auto">
                    {text}
                  </button>
                ) : (
                  <span dir="auto">{text}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!metaAvailable && (
        <span className="text-xs opacity-80">פרטי לידים מ-Meta אינם זמינים כרגע, ולכן חלק מהפרטים חסרים.</span>
      )}
    </div>
  );
}
