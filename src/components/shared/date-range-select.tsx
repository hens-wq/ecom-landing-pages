"use client";

import { CalendarRange, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DATE_RANGE_PRESETS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface DateRangeSelectProps {
  presetId: string;
  onPresetChange: (presetId: string) => void;
}

/** Shared between the Dashboard and Leads pages - both filter by the same date-range preset concept. */
export function DateRangeSelect({ presetId, onPresetChange }: DateRangeSelectProps) {
  const activePreset = DATE_RANGE_PRESETS.find((preset) => preset.id === presetId) ?? DATE_RANGE_PRESETS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CalendarRange className="size-4" />
          <span>
            טווח תאריכים: <span className="font-semibold">{activePreset.label}</span>
          </span>
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {DATE_RANGE_PRESETS.map((preset) => (
          <DropdownMenuItem
            key={preset.id}
            onSelect={() => onPresetChange(preset.id)}
            className={cn(preset.id === presetId && "bg-accent text-accent-foreground")}
          >
            {preset.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
