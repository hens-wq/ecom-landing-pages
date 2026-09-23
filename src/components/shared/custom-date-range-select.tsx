"use client";

import { useState } from "react";
import { CalendarRange, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { CUSTOM_DATE_RANGE_PRESET_ID, type DateRangeSelection } from "@/lib/advertising/date-range";
import { isoDateInTimezone } from "@/lib/advertising/timezone";
import { DATE_RANGE_PRESETS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface CustomDateRangeSelectProps {
  selection: DateRangeSelection;
  onChange: (selection: DateRangeSelection) => void;
  label?: string;
}

const CUSTOM_LABEL = "טווח מותאם אישית (Custom Range)";

/**
 * Extends the Dashboard's simpler DateRangeSelect with a "Custom Range"
 * option (From/To date pickers) - kept as its OWN component (not a shared
 * prop on DateRangeSelect) so the Dashboard's date picker is never at risk
 * from this. Meant to be rendered more than once against the SAME lifted
 * `selection` state (see app/leads/page.tsx, which renders this both in its
 * top controls and again in the filter row) - since both instances are
 * controlled by the same state, they can never drift out of sync.
 */
export function CustomDateRangeSelect({ selection, onChange, label = "טווח תאריכים" }: CustomDateRangeSelectProps) {
  const [open, setOpen] = useState(false);
  const [draftSince, setDraftSince] = useState(selection.customSince ?? "");
  const [draftUntil, setDraftUntil] = useState(selection.customUntil ?? "");

  const isCustom = selection.presetId === CUSTOM_DATE_RANGE_PRESET_ID;
  const activePreset = DATE_RANGE_PRESETS.find((preset) => preset.id === selection.presetId);
  const buttonLabel = isCustom
    ? selection.customSince && selection.customUntil
      ? `${selection.customSince} — ${selection.customUntil}`
      : "טווח מותאם אישית"
    : (activePreset ?? DATE_RANGE_PRESETS[0]).label;

  const today = isoDateInTimezone(new Date());
  const canApply = Boolean(draftSince && draftUntil && draftSince <= draftUntil);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      // Reset the draft fields to whatever's currently applied each time the menu (re)opens, so a previous unsaved edit never lingers.
      setDraftSince(selection.customSince ?? "");
      setDraftUntil(selection.customUntil ?? "");
    }
  }

  function applyCustomRange() {
    if (!canApply) return;
    onChange({ presetId: CUSTOM_DATE_RANGE_PRESET_ID, customSince: draftSince, customUntil: draftUntil });
    setOpen(false);
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CalendarRange className="size-4" />
          <span>
            {label}: <span className="font-semibold">{buttonLabel}</span>
          </span>
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {DATE_RANGE_PRESETS.map((preset) => (
          <DropdownMenuItem
            key={preset.id}
            onSelect={() => {
              onChange({ presetId: preset.id, customSince: null, customUntil: null });
              setOpen(false);
            }}
            className={cn(!isCustom && preset.id === selection.presetId && "bg-accent text-accent-foreground")}
          >
            {preset.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {/*
          A plain div, not a DropdownMenuItem - Radix's Item primitive
          captures pointer/keyboard events for its own select-and-close
          behavior, which fights with typing into a nested native date
          input. stopPropagation on keydown keeps Radix's roving-focus/
          typeahead from hijacking arrow keys while a date field is focused.
        */}
        <div
          className={cn("flex flex-col gap-2 rounded-sm px-2 py-1.5", isCustom && "bg-accent/60")}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <span className={cn("text-sm", isCustom && "font-semibold text-accent-foreground")}>{CUSTOM_LABEL}</span>
          <div className="flex items-center gap-2">
            <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
              מתאריך (From)
              <Input
                type="date"
                value={draftSince}
                max={draftUntil || today}
                onChange={(e) => setDraftSince(e.target.value)}
                className="h-8 text-xs"
                dir="ltr"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
              עד תאריך (To)
              <Input
                type="date"
                value={draftUntil}
                min={draftSince || undefined}
                max={today}
                onChange={(e) => setDraftUntil(e.target.value)}
                className="h-8 text-xs"
                dir="ltr"
              />
            </label>
          </div>
          <Button size="sm" disabled={!canApply} onClick={applyCustomRange} className="self-start">
            החל טווח (Apply)
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
