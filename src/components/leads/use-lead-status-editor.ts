"use client";

import { useState } from "react";

import { ENROLLED_MAIN_STATUS, SECONDARY_STATUSES_BY_MAIN, type LeadStatusRecord, type MainStatus } from "@/lib/lead-status/types";
import { enrolledSecondaryFromPayment, isPositiveAmount } from "@/lib/lead-status/validation";

export interface LeadStatusPatch {
  mainStatus: string;
  secondaryStatus: string;
  fullPaymentAmount?: number | null;
  partialPaymentAmount?: number | null;
  normalizedPhone?: string | null;
}

/**
 * Drives one lead's Main/Secondary status and payment amounts. Two states are
 * tracked separately:
 *  - `current`: the last server-confirmed record - what the calculations and
 *    every other row would see right now.
 *  - the draft selection: what the dropdowns show, which can run ahead of
 *    `current` while a payment type is chosen but its amount isn't entered yet
 *    (see awaitingAmount).
 *
 * For an enrolled lead the amount drives the payment status: typing a Full or
 * Partial amount sets "תשלום מלא" or "תשלום חלקי", and clearing both returns
 * the lead to "נרשם". Enrolling itself never needs an amount.
 */
export function useLeadStatusEditor(record: LeadStatusRecord, onSave: (patch: LeadStatusPatch) => Promise<LeadStatusRecord>) {
  const [current, setCurrent] = useState(record);
  const [draftMain, setDraftMain] = useState<MainStatus>(record.mainStatus);
  const [draftSecondary, setDraftSecondary] = useState<string>(record.secondaryStatus);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (current.leadId !== record.leadId) {
    // A different lead's record was passed in (row reused across a re-sort/refilter) - resync from scratch.
    setCurrent(record);
    setDraftMain(record.mainStatus);
    setDraftSecondary(record.secondaryStatus);
  }

  function requiredAmountFor(mainStatus: MainStatus, secondaryStatus: string): number | null {
    if (mainStatus !== ENROLLED_MAIN_STATUS) return null;
    if (secondaryStatus === "תשלום מלא") return current.fullPaymentAmount;
    if (secondaryStatus === "תשלום חלקי") return current.partialPaymentAmount;
    return null;
  }

  const isPaymentDraft = draftMain === ENROLLED_MAIN_STATUS && draftSecondary !== ENROLLED_MAIN_STATUS;
  const awaitingAmount =
    isPaymentDraft &&
    !isPositiveAmount(requiredAmountFor(draftMain, draftSecondary)) &&
    (draftMain !== current.mainStatus || draftSecondary !== current.secondaryStatus);

  async function commit(patch: LeadStatusPatch) {
    setPending(true);
    setError(null);
    try {
      const saved = await onSave(patch);
      setCurrent(saved);
      setDraftMain(saved.mainStatus);
      setDraftSecondary(saved.secondaryStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה בשמירה.");
    } finally {
      setPending(false);
    }
  }

  function changeMainStatus(newMain: MainStatus) {
    setError(null);
    if (newMain === ENROLLED_MAIN_STATUS) {
      const newSecondary = enrolledSecondaryFromPayment(current.fullPaymentAmount, current.partialPaymentAmount) ?? ENROLLED_MAIN_STATUS;
      setDraftMain(newMain);
      setDraftSecondary(newSecondary);
      void commit({
        mainStatus: newMain,
        secondaryStatus: newSecondary,
        fullPaymentAmount: current.fullPaymentAmount,
        partialPaymentAmount: current.partialPaymentAmount,
      });
      return;
    }

    const newSecondary = SECONDARY_STATUSES_BY_MAIN[newMain][0];
    setDraftMain(newMain);
    setDraftSecondary(newSecondary);
    void commit({
      mainStatus: newMain,
      secondaryStatus: newSecondary,
      fullPaymentAmount: current.fullPaymentAmount,
      partialPaymentAmount: current.partialPaymentAmount,
    });
  }

  function changeSecondaryStatus(newSecondary: string) {
    setDraftSecondary(newSecondary);
    setError(null);

    if (draftMain === ENROLLED_MAIN_STATUS && newSecondary === ENROLLED_MAIN_STATUS) {
      // Picking "נרשם" from the dropdown is the one deliberate way to say "no
      // payment", so any amount entered so far is cleared with it.
      void commit({
        mainStatus: ENROLLED_MAIN_STATUS,
        secondaryStatus: ENROLLED_MAIN_STATUS,
        fullPaymentAmount: null,
        partialPaymentAmount: null,
      });
      return;
    }

    if (draftMain !== ENROLLED_MAIN_STATUS || isPositiveAmount(requiredAmountFor(draftMain, newSecondary))) {
      void commit({
        mainStatus: draftMain,
        secondaryStatus: newSecondary,
        fullPaymentAmount: current.fullPaymentAmount,
        partialPaymentAmount: current.partialPaymentAmount,
      });
    }
    // else: a payment type with no amount yet - staged until an amount is entered.
  }

  function changeFullPayment(amount: number | null) {
    const entered = isPositiveAmount(amount);
    void commit({
      mainStatus: ENROLLED_MAIN_STATUS,
      secondaryStatus: entered ? "תשלום מלא" : (enrolledSecondaryFromPayment(null, current.partialPaymentAmount) ?? ENROLLED_MAIN_STATUS),
      fullPaymentAmount: amount,
      partialPaymentAmount: entered ? null : current.partialPaymentAmount,
    });
  }

  function changePartialPayment(amount: number | null) {
    const entered = isPositiveAmount(amount);
    void commit({
      mainStatus: ENROLLED_MAIN_STATUS,
      secondaryStatus: entered ? "תשלום חלקי" : (enrolledSecondaryFromPayment(current.fullPaymentAmount, null) ?? ENROLLED_MAIN_STATUS),
      fullPaymentAmount: entered ? null : current.fullPaymentAmount,
      partialPaymentAmount: amount,
    });
  }

  return {
    mainStatus: draftMain,
    secondaryStatus: draftSecondary,
    fullPaymentAmount: current.fullPaymentAmount,
    partialPaymentAmount: current.partialPaymentAmount,
    pending,
    error,
    awaitingAmount,
    changeMainStatus,
    changeSecondaryStatus,
    changeFullPayment,
    changePartialPayment,
  };
}
