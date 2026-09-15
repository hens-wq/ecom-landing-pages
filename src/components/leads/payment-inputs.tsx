"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import type { MainStatus } from "@/lib/lead-status/types";

interface AmountFieldProps {
  value: number | null;
  active: boolean;
  disabled?: boolean;
  onCommit: (amount: number | null) => void;
}

/** One amount field, committed on blur (not per keystroke) - `active` controls whether it's currently the counted field (see lib/lead-status/calculations.ts activePaymentAmount) vs a stale leftover value from a previous status that must stay visible but never editable. */
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
      className="h-8 w-24 text-xs tabular-nums-he"
    />
  );
}

interface PaymentInputsProps {
  mainStatus: MainStatus;
  secondaryStatus: string;
  fullPaymentAmount: number | null;
  partialPaymentAmount: number | null;
  disabled?: boolean;
  onFullPaymentChange: (amount: number | null) => void;
  onPartialPaymentChange: (amount: number | null) => void;
}

/**
 * Only the amount field matching the CURRENT secondary status is editable
 * and counted (see calculations.ts) - the other stays visible if it already
 * has a value (never silently erased, per spec) but greyed out with a note
 * that it isn't being counted right now.
 */
export function PaymentInputs({
  mainStatus,
  secondaryStatus,
  fullPaymentAmount,
  partialPaymentAmount,
  disabled,
  onFullPaymentChange,
  onPartialPaymentChange,
}: PaymentInputsProps) {
  const isRegistered = mainStatus === "נרשם";
  const fullActive = isRegistered && secondaryStatus === "תשלום מלא";
  const partialActive = isRegistered && secondaryStatus === "תשלום חלקי";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <AmountField value={fullPaymentAmount} active={fullActive} disabled={disabled} onCommit={onFullPaymentChange} />
        {!fullActive && fullPaymentAmount !== null && (
          <span className="text-[10px] text-muted-foreground/70">לא נספר</span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <AmountField value={partialPaymentAmount} active={partialActive} disabled={disabled} onCommit={onPartialPaymentChange} />
        {!partialActive && partialPaymentAmount !== null && (
          <span className="text-[10px] text-muted-foreground/70">לא נספר</span>
        )}
      </div>
    </div>
  );
}
