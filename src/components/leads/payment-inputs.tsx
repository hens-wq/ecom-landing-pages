"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AmountFieldProps {
  value: number | null;
  /** Whether this is the field matching the current secondary status - counted (see lib/lead-status/calculations.ts activePaymentAmount), editable, and visually emphasized. When false the field may still show a stale leftover value (never silently erased, per spec) but is disabled and un-emphasized. */
  active: boolean;
  disabled?: boolean;
  onCommit: (amount: number | null) => void;
}

/** Committed on blur (not per keystroke). */
function AmountField({ value, active, disabled, onCommit }: AmountFieldProps) {
  const [draft, setDraft] = useState(value === null ? "" : String(value));
  const [trackedValue, setTrackedValue] = useState(value);

  // Keep the draft in sync when the confirmed value changes from outside (a
  // successful save, or another field's change re-rendering this row) -
  // adjusted during render (React's documented pattern for this), not in an
  // effect, to avoid the extra render pass an effect-based sync would cause.
  if (value !== trackedValue) {
    setTrackedValue(value);
    setDraft(value === null ? "" : String(value));
  }

  function commit() {
    const trimmed = draft.trim();
    if (trimmed === "") {
      onCommit(null);
      return;
    }
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed) && parsed > 0) {
      onCommit(parsed);
    } else {
      setDraft(value === null ? "" : String(value)); // invalid input - revert to last confirmed value
    }
  }

  return (
    <div className="flex flex-col gap-0.5">
      <Input
        type="number"
        min="0"
        step="1"
        dir="ltr"
        value={draft}
        disabled={disabled || !active}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        placeholder={active ? "סכום" : "-"}
        className={cn("h-8 w-28 text-xs tabular-nums-he", active && "border-primary/50 ring-1 ring-primary/20")}
      />
      {!active && value !== null && <span className="text-[10px] text-muted-foreground/70">לא נספר</span>}
    </div>
  );
}

interface PaymentFieldProps {
  isActive: boolean;
  value: number | null;
  disabled?: boolean;
  onChange: (amount: number | null) => void;
}

/** Full Payment column cell - active (emphasized + editable) only when Main Status = נרשם and Secondary Status = תשלום מלא. */
export function FullPaymentField({ isActive, value, disabled, onChange }: PaymentFieldProps) {
  return <AmountField value={value} active={isActive} disabled={disabled} onCommit={onChange} />;
}

/** Partial Payment column cell - active (emphasized + editable) only when Main Status = נרשם and Secondary Status = תשלום חלקי. */
export function PartialPaymentField({ isActive, value, disabled, onChange }: PaymentFieldProps) {
  return <AmountField value={value} active={isActive} disabled={disabled} onCommit={onChange} />;
}
