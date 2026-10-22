"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

interface MissingPaymentBannerProps {
  /** Enrolled leads with no payment amount, counted across ALL dates - not just the range on screen. */
  count: number;
  isFilterActive: boolean;
  isBusy: boolean;
  error: string | null;
  onActivate: () => void;
  onClear: () => void;
}

/** Red alert shown above the Leads page whenever an enrolled lead is still missing its payment amount. */
export function MissingPaymentBanner({ count, isFilterActive, isBusy, error, onActivate, onClear }: MissingPaymentBannerProps) {
  if (count <= 0) return null;

  const message =
    count === 1 ? "יש ליד אחד שנרשם ועדיין חסר לו סכום תשלום" : `יש ${count} לידים שנרשמו ועדיין חסר להם סכום תשלום`;

  return (
    <div role="alert" className="flex flex-wrap items-center gap-2 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-destructive">
      {isFilterActive ? (
        <span className="flex-1 font-semibold">⚠ {message} - מוצגים כעת</span>
      ) : (
        <button
          type="button"
          onClick={onActivate}
          disabled={isBusy}
          className="flex-1 text-right font-semibold hover:underline disabled:opacity-60"
        >
          ⚠ {message}
          <span className="mr-2 text-xs font-normal opacity-80">{isBusy ? "(טוען...)" : "(לחצו להצגה)"}</span>
        </button>
      )}
      {isFilterActive && (
        <Button variant="outline" size="sm" onClick={onClear} className="gap-1 border-destructive/50 bg-background">
          <X className="size-3.5" />
          נקה סינון
        </Button>
      )}
      {error && <span className="basis-full text-xs">{error}</span>}
    </div>
  );
}
