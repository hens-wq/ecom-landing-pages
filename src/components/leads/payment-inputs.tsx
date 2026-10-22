"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AmountFieldProps {
  value: number | null;
  /** Whether an amount can be typed here - true for every enrolled lead, since entering an amount is what sets its payment status. */
  editable: boolean;
  /** Whether this is the payment the lead currently counts (see calculations.ts activePaymentAmount) - emphasized. A value in a non-emphasized field is a leftover and shows "לא נספר". */
  emphasized: boolean;
  disabled?: boolean;
  onCommit: (amount: number | null) => void;
}

/** Committed on blur (not per keystroke). */
function AmountField({ value, editable, emphasized, disabled, onCommit }: AmountFieldProps) {
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
      if (value !== null) onCommit(null);
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setDraft(value === null ? "" : String(value)); // invalid input - revert to last confirmed value
      return;
    }
    if (parsed !== value) onCommit(parsed);
  }

  return (
    <div className="flex flex-col gap-0.5">
      <Input
        type="number"
        min="0"
        step="1"
        dir="ltr"
        value={draft}
        disabled={disabled || !editable}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        placeholder={editable ? "סכום" : "-"}
        className={cn("h-8 w-28 text-xs tabular-nums-he", emphasized && "border-primary/50 ring-1 ring-primary/20")}
      />
      {!emphasized && value !== null && <span className="text-[10px] text-muted-foreground/70">לא נספר</span>}
    </div>
  );
}

interface PaymentFieldProps {
  isEditable: boolean;
  isActive: boolean;
  value: number | null;
  disabled?: boolean;
  onChange: (amount: number | null) => void;
}

/** Full Payment column cell - editable for every enrolled lead; emphasized when the lead's Secondary Status is תשלום מלא. */
export function FullPaymentField({ isEditable, isActive, value, disabled, onChange }: PaymentFieldProps) {
  return <AmountField value={value} editable={isEditable} emphasized={isActive} disabled={disabled} onCommit={onChange} />;
}

/** Partial Payment column cell - editable for every enrolled lead; emphasized when the lead's Secondary Status is תשלום חלקי. */
export function PartialPaymentField({ isEditable, isActive, value, disabled, onChange }: PaymentFieldProps) {
  return <AmountField value={value} editable={isEditable} emphasized={isActive} disabled={disabled} onCommit={onChange} />;
}
