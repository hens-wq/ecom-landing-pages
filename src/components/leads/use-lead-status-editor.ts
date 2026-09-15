"use client";

import { useState } from "react";

import { SECONDARY_STATUSES_BY_MAIN, type LeadStatusRecord, type MainStatus } from "@/lib/lead-status/types";

export interface LeadStatusPatch {
  mainStatus: string;
  secondaryStatus: string;
  fullPaymentAmount?: number | null;
  partialPaymentAmount?: number | null;
  phone?: string | null;
}

function isPositiveAmount(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * Drives one lead's Main/Secondary status + payment amounts. Two states are
 * tracked deliberately separately:
 *  - `current`: the last server-CONFIRMED record - what calculations.ts and
 *    every other row/page would see if they read this lead's status right now.
 *  - the draft main/secondary selection: what the dropdowns show, which can
 *    run ahead of `current` while "נרשם" is selected but no payment amount
 *    has been entered yet (see awaitingAmount) - required so a "תשלום מלא"
 *    selection doesn't have to (impossibly) already carry an amount before
 *    the amount field itself is even enabled.
 *
 * Any OTHER status transition (i.e. not "נרשם") never needs an amount, so it
 * saves immediately, same as before.
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
    if (mainStatus !== "נרשם") return null;
    if (secondaryStatus === "תשלום מלא") return current.fullPaymentAmount;
    if (secondaryStatus === "תשלום חלקי") return current.partialPaymentAmount;
    return null;
  }

  const awaitingAmount =
    draftMain === "נרשם" &&
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
    const newSecondary = SECONDARY_STATUSES_BY_MAIN[newMain][0];
    setDraftMain(newMain);
    setDraftSecondary(newSecondary);
    setError(null);
    if (newMain !== "נרשם" || isPositiveAmount(requiredAmountFor(newMain, newSecondary))) {
      void commit({
        mainStatus: newMain,
        secondaryStatus: newSecondary,
        fullPaymentAmount: current.fullPaymentAmount,
        partialPaymentAmount: current.partialPaymentAmount,
      });
    }
    // else: staged - waiting for an amount via changeFullPayment/changePartialPayment.
  }

  function changeSecondaryStatus(newSecondary: string) {
    setDraftSecondary(newSecondary);
    setError(null);
    if (draftMain !== "נרשם" || isPositiveAmount(requiredAmountFor(draftMain, newSecondary))) {
      void commit({
        mainStatus: draftMain,
        secondaryStatus: newSecondary,
        fullPaymentAmount: current.fullPaymentAmount,
        partialPaymentAmount: current.partialPaymentAmount,
      });
    }
  }

  function changeFullPayment(amount: number | null) {
    const mainStatus = draftMain === "נרשם" && draftSecondary === "תשלום מלא" ? draftMain : current.mainStatus;
    const secondaryStatus = draftMain === "נרשם" && draftSecondary === "תשלום מלא" ? draftSecondary : current.secondaryStatus;
    void commit({ mainStatus, secondaryStatus, fullPaymentAmount: amount, partialPaymentAmount: current.partialPaymentAmount });
  }

  function changePartialPayment(amount: number | null) {
    const mainStatus = draftMain === "נרשם" && draftSecondary === "תשלום חלקי" ? draftMain : current.mainStatus;
    const secondaryStatus = draftMain === "נרשם" && draftSecondary === "תשלום חלקי" ? draftSecondary : current.secondaryStatus;
    void commit({ mainStatus, secondaryStatus, fullPaymentAmount: current.fullPaymentAmount, partialPaymentAmount: amount });
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
